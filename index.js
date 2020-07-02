const { google } = require("googleapis");
const utils = require("utils");
const fs = require("fs");
const fsPath = require("path");
const lineBreaks = new RegExp(/\\n/,"g");

process.google = { files: [], folders: [] };

const initialise = async({ privateKey, privateKeyId }) => {
	lineBreaks.lastIndex = 0;
	const credentials = {
		type: "service_account",
		project_id: "api-project-927120566382",
		private_key_id: privateKeyId,
		private_key: privateKey,
		client_email: "ragetoast@api-project-927120566382.iam.gserviceaccount.com",
		client_id: "101652556790738375238",
		auth_uri: "https://accounts.google.com/o/oauth2/auth",
		token_uri: "https://oauth2.googleapis.com/token",
		auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
		client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ragetoast%40api-project-927120566382.iam.gserviceaccount.com"
	};
	credentials.private_key = credentials.private_key.replace(lineBreaks,"\n")
	const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, ['https://www.googleapis.com/auth/drive',
					'https://www.googleapis.com/auth/drive.file',
					'https://www.googleapis.com/auth/drive.metadata'],"",credentials.private_key_id);
	await auth.authorize();
	const drive = await google.drive({ version: 'v3', auth });
	return { drive, auth };
};

const loadFile = async (id) => {
	let file = process.google.files.find(x => x.id === id);
	if (file){
		return file;
	} else {
		file = {
			id, 
			data: null,
			originalData: {},
			callbacks: [],
			onFileChange: (callback) => {
				file.callbacks.push(callback);
			}
		};
		const res = await drive.files.list({
			auth: auth,
			q: "'root' in parents",
			fields: "files(id, name, mimeType)"
		});
		const metadata = res.data.files.find(x=>x.name === id);
		if (metadata) {
			console.log("Metadata Found: ", metadata);
			let data = await drive.files.get({ fileId: metadata.id, alt: 'media'});
			if (data) {
				const dataStr = JSON.stringify(data);
				if (!dataStr) {
					throw new Error(`failed to parse ${id} to json string.`);
				}

				const dateFormat = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/;
				data = JSON.parse(dataStr, (key, value) => {
					if (typeof value === "string" && dateFormat.test(value)) {
					return new Date(value);
					}
					return value;
				});

				if (!data) {
					throw new Error(`failed to parse ${id} to an object with valid dates.`);
				}
				file.data = data;
				console.log(`file for ${id} was loaded from google drive.`);
			} else {
				console.log(`new file ${id} was created on google drive.`);
				file.data = null;
			}
		}
		process.google.files.push(file);
		return file;
	}
};

const createRemoteRootFile = async ( { drive, name, data } ) => {
	const resource = { name };
	console.log(`-> 	creating ${name} file in the root folder.`);
	let media = { body: data };
	const item = await drive.files.create({ resource, media, fields: 'id, parents' });
	return { id: item.data.id, name, data, parentId: item.data.parents[0], parentName: "My Drive" };
};

const deleteRemoteFolder = async ( { drive, folderName } ) => {

	const res = await drive.files.list({
		q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`
	});
	const parentFolderIds = res.data.files.filter(x=>x.name === folderName).map(x=>x.id);
	for(const folderId of parentFolderIds){
		await drive.files.delete({
			'fileId': folderId
		});
	};
};

const deleteAllFiles = async ( { drive } ) => {
	const res = await drive.files.list({
		q: `mimeType != 'application/vnd.google-apps.folder'`
	});
	const fileIds = res.data.files.map(x=>x.id)
	for(const folderId of fileIds){
		await drive.files.delete({
			'fileId': folderId
		});
	};
};

const createRemoteFolder = async ({ drive, name, parentId, parentName }) => {
	const resource = { name, mimeType: "application/vnd.google-apps.folder", parents: [ parentId ] };
	console.log(`-> creating ${name} folder in ${parentName}.`);
	const res = await drive.files.create({ resource });
	return { name, id: res.data.id, parentName, parentId };
};

const createFileInFolder = async ({ drive, fileName, fileData, parentId, parentName }) => {
	const resource = { name: fileName, parents: [parentId] };
	console.log(`->		creating ${fileName} file in the ${parentName} folder.`);
	const body = fileData;
	const media = { body };
	const res = await drive.files.create({ resource, media, fields: 'id' });
	return { name: fileName, id: res.data.id, parentName, parentId };
};

const hasChanged = (file) => {
	console.log(`checking file size diff for ${file.id}`);
	const snapshotJSON = JSON.stringify(file.data);
	const snapshot = JSON.parse(snapshotJSON);
	return utils.sizeOf(snapshot) !== utils.sizeOf(file.originalData);
}

const getRemoteFolderMetadata = async ( { drive , pageToken = "" }) => {
	let query = "mimeType = 'application/vnd.google-apps.folder'";
	let res = await drive.files.list({ 
		q: query, 
		pageSize : 20, 
		pageToken, 
		orderBy: 'modifiedTime asc', 
		fields: "nextPageToken,files(id, name, parents, trashed, mimeType)" 
	});
	let fileMetadata = res.data.files.filter( x => x.trashed === false).map(x =>  { return {
		name: x.name,
		id: x.id,
		parentId: x.parents[0]
	}});
	if (res.data.nextPageToken){
		fileMetadata =  fileMetadata.concat(await getRemoteFolderMetadata({ drive, pageToken: res.data.nextPageToken }));
	}
	for(const item of fileMetadata){
		let res = await drive.files.get({ fileId: item.parentId });
		item.parentName = res.data.name;
	};
	
	return fileMetadata;
}

const getRemoteFileMetadata = async ( { drive, pageToken = "" }) => {
	let query = "mimeType != 'application/vnd.google-apps.folder'";
	let res = await drive.files.list({ 
		q: query, 
		pageSize : 20, 
		pageToken, 
		orderBy: 'modifiedTime asc', 
		fields: "nextPageToken,files(id, name, parents, trashed, mimeType)" 
	});
	let fileMetadata = res.data.files.filter( x => x.trashed === false).map(x =>  { return {
		name: x.name,
		id: x.id,
		parentId: x.parents[0],
		parentName: null
	}});
	if (res.data.nextPageToken){
		fileMetadata =  fileMetadata.concat(await getRemoteFileMetadata({ drive, pageToken: res.data.nextPageToken }));
	}
	return fileMetadata;
}

module.exports = {
	upload: async ( { privateKey, privateKeyId, rootDirPath, rootDirName } ) => {
		
		if (!rootDirName || !rootDirPath || !privateKey || !privateKeyId){
			return;
		}

		let rootDir = fsPath.parse(`${rootDirPath}/${rootDirName}`);
		rootDir = fsPath.format(rootDir);
		if (!fs.existsSync(rootDir)){
			console.log(`the ${rootDir} does not exist.`);
			return;
		}
		
		const paths = await utils.getFullPaths(rootDir);
		const { drive } = await initialise({ privateKey, privateKeyId });

		await deleteRemoteFolder({ drive, folderName: rootDirName });

		let rootFolder = process.google.folders.find( x => x.name === rootDirName && x.parentName === "My Drive" );
		if (!rootFolder){
			const tempFile = await createRemoteRootFile({ drive, name: "tempFile",data: ""});
			rootFolder = await createRemoteFolder({ drive, name: rootDirName, parentId: tempFile.parentId, parentName: tempFile.parentName  });
		}
	
		if (process.google.folders.length === 0){
			process.google.folders  = await getRemoteFolderMetadata({ drive });
			process.google.folders.push({ name: "My Drive", id: rootFolder.parentId, parentName: null, parentId: null });
		}
	
		if (process.google.files.length === 0){
			process.google.files =  await getRemoteFileMetadata({ drive });
			for (const file of process.google.files){
				const folder = process.google.folders.find( x => x.id === file.parentId);
				file.parentName = folder.name;
			};
		}

		for(let path of paths) {
			let stat = fsPath.parse(path);
			const pathFolders = stat.dir.replace(rootDirName,"").replace(stat.root,"");
			let folderNames =  pathFolders.split("/").filter(x=>x);
			if (folderNames.length === 0 || folderNames.filter( x => x.indexOf(String.fromCharCode(92)) > -1).length > 0 ){
				folderNames = pathFolders.split(String.fromCharCode(92)).filter(x=>x);
			}
			let fileName =  stat.base;
			let parent = rootFolder;
			for(const _parentName of folderNames){
				const hasParent = process.google.folders.find( x => x.name === _parentName && x.parentId === parent.id);
				if (hasParent){
					parent = hasParent;
				} else {
					parent = await createRemoteFolder({ drive, name: _parentName, parentId: parent.id, parentName: parent.name  });
					process.google.folders.push(parent);
				}
			};
			if (!process.google.files.find( x => x.name === fileName && x.parentId === parent.id)) {
				const fileData = fs.createReadStream(path);
				const newFile = await createFileInFolder( { drive, fileName, fileData, parentId: parent.id, parentName: parent.name } );
				process.google.files.push(newFile);
			}
		};

		
	},
	download: async ( { privateKey, privateKeyId, rootDirPath, rootDirName } ) => {
		if (!rootDirName || !rootDirPath || !privateKey || !privateKeyId){
			return;
		}
	}
};