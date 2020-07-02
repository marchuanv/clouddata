const { google } = require("googleapis");
const utils = require("utils");
const fs = require("fs");
const fsPath = require("path");
const lineBreaks = new RegExp(/\\n/,"g");

process.google = { files: [], folders: [] };

function RetryPolicy() {

	let callbacks = [];
	const invoke = async (func, args) => {
		try {
			const result = await func(args);
			return {
				retry: false,
				result,
				error: null
			};
		} catch(error) {
			return {
				retry: true,
				result: null,
				error
			};
		}
	};

	this.config = (config, retryMax = 3) => {
		if (!Array.isArray(config)){
			throw new Error("invalid config argument");
		}
		for(const item of config){
			this[item.func.name] = (args) => {
				return new Promise(async (resolve, reject) => {
					let _continueIdenticalFuncCall = true;
					let call = callbacks.find(x => x.name === item.func.name);
					if (call){
						const args1 = call.args;
						const args2 = args;
						_continueIdenticalFuncCall = item.continueIdenticalFuncCall(args1, args2);
					}
					if (_continueIdenticalFuncCall === true) {
						call = {
							name: item.func.name,
							func: item.func,
							args,
							timeout: 1000,
							retryCount: 0,
							retryMax,
							result: null,
							error: null
						};
						callbacks.push(call);
						let response = await invoke(call.func, call.args);
						call.error = response.error;
						call.result = response.result;
						if (response.error){
							await reject(response.error);
						} else {
							await resolve(response.result);
						}
					} else {
						const id = setInterval(async() => {
							if (call.error) {
								clearInterval(id);
								await reject(call.error);
							} else if (call.result) {
								clearInterval(id);
								await resolve(call.result);
							}
						},1000);
					}
				});
			};
		};
	}

	// const id = setInterval(async() => {
	// 	if (stack.length === 0){
	// 		return;
	// 	}
	// 	const item = stack.pop();
	// 	let response = await call(item.func, item.args);
	// 	while(response.retry === true){
	// 		if (response.error.message.indexOf("User Rate Limit Exceeded.") > -1 ){
	// 			if (response.retryCount === 3){
	// 				await item.reject(response.error);
	// 			} else {
	// 				response.retryCount = response.retryCount + 1;
	// 			}
	// 			response = await call(item.func, item.args);
	// 		} else {
	// 			await item.reject(response.error);
	// 		}
	// 	}
	// 	await item.resolve(response.results);
	// },1000);


};

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
	const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, [ 
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/drive.metadata'],
	 "", credentials.private_key_id);

	await auth.authorize();
	const drive = await google.drive({ version: 'v3', auth });
	return { drive, auth };
};


const createRemoteRootFile = async ( { drive, name, data } ) => {
	const resource = { name };
	console.log(`-> 	creating ${name} file in the root folder.`);
	let media = { body: data };
	const item = await drive.files.create({ resource, media, fields: 'id, parents' });
	return { id: item.data.id, name, data, parentId: item.data.parents[0], parentName: "My Drive" };
};


const deleteRemoteFile = async ( { drive, name } ) => {
	const res = await drive.files.list({
		q: `mimeType != 'application/vnd.google-apps.folder'`,
		fields: 'files(id, name)'
	});
	const fileId = res.data.files.filter(file => file.name === name).map(file => file.id)[0];
	if (!fileId){
		throw new Error(`${name} does not exist.`);
	}
	await drive.files.delete({
		'fileId': fileId
	});
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
	
	const folders = await getRemoteFolderMetadata( {drive } );

	if (folders.find( x => x.name === folderName)){
		throw new Error(`failed to delete the ${folderName} folder`);
	}

};

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


const createRemoteFolders = async ( { drive, pathInfo, rootFolder, rootDirName }) => {
	const pathFolders = pathInfo.dir.replace(rootDirName,"").replace(pathInfo.root,"");
	let folderNames =  pathFolders.split("/").filter(x=>x);
	if (folderNames.length === 0 || folderNames.filter( x => x.indexOf(String.fromCharCode(92)) > -1).length > 0 ){
		folderNames = pathFolders.split(String.fromCharCode(92)).filter(x=>x);
	}
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
	return parent;
};

const createRemoteFoldersAndFile = async ( { drive, path, rootFolder, rootDirName }) => {
	let pathInfo = fsPath.parse(path);
	const parent = await retryPolicy.createRemoteFolders({ drive, pathInfo, rootFolder, rootDirName });
	let fileName =  pathInfo.base;
	if (!process.google.files.find( x => x.name === fileName && x.parentId === parent.id)) {
		const fileData = fs.createReadStream(path);
		const newFile = await createFileInFolder( { drive, fileName, fileData, parentId: parent.id, parentName: parent.name } );
		process.google.files.push(newFile);
	}
};

const retryPolicy = new RetryPolicy();
retryPolicy.config([ { 
	continueIdenticalFuncCall: ( args1, args2 ) => {
		return true;
	},
	func: createRemoteFoldersAndFile
},{
	continueIdenticalFuncCall: ( args1, args2 ) => {
		if (args1.pathInfo.dir === args2.pathInfo.dir){
			return false;
		}
		return true;
	},
	func: createRemoteFolders
}]);

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
			await deleteRemoteFile({ drive, name: "tempFile" });
			const tempFile = await createRemoteRootFile({ drive, name: "tempFile", data: "" });
			rootFolder = await createRemoteFolder({ drive, name: rootDirName, parentId: tempFile.parentId, parentName: tempFile.parentName  });
		}
	
		if (process.google.folders.length === 0){
			process.google.folders  = await getRemoteFolderMetadata({ drive });
			process.google.folders.push({ name: "My Drive", id: rootFolder.parentId, parentName: null, parentId: null });
		}
	
		if (process.google.files.length === 0){
			process.google.files = await getRemoteFileMetadata({ drive });
			for (const file of process.google.files){
				const folder = process.google.folders.find( x => x.id === file.parentId);
				file.parentName = folder.name;
			};
		}

		const promises = [];
		
		for(let path of paths) {
		
			const promise = retryPolicy.createRemoteFoldersAndFile({ drive, path, rootFolder, rootDirName });
			promises.push(promise);
		};

		await Promise.all(promises);
	},
	download: async ( { privateKey, privateKeyId, rootDirPath, rootDirName } ) => {
		if (!rootDirName || !rootDirPath || !privateKey || !privateKeyId){
			return;
		}
	}
};