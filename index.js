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

	const callback = async (config, args, resolve, reject) => {
		let id = config.getFunctionId(args);
		let call = callbacks.find(x => x.name === config.func.name && x.id === id);
		if (!call || (call && config.allowIdenticalCalls === true) ) {
			call = {
				id,
				name: config.func.name,
				func: config.func,
				args,
				retryCount: 0,
				maxRetry: config.maxRetry,
				result: null,
				error: null
			};
			let response = await invoke(call.func, call.args);
			call.error = response.error;
			call.result = response.result;
			callbacks.push(call);
		}

		if (call.error) {
			if (call.retryCount < config.maxRetry){
				call.retryCount = call.retryCount + 1;
				const timeout = call.retryCount * 1000;
				call.error = null;
				console.log(`${config.func.name}(${call.id}) resulted in error, retrying ${call.retryCount} of ${config.maxRetry}`);
				setTimeout(() => {
					callback(config, args, resolve, reject);
				}, timeout);
			} else {
				await reject(call.error);
			}
		} else if (call.result) {
			call.retryCount = 0;
			await resolve(call.result);
		} else {
			setTimeout(() => {
				callback(config, args, resolve, reject);
			});
		}
	};

	this.config = (config, maxRetry = 3) => {
		if (!Array.isArray(config)){
			throw new Error("invalid config argument");
		}
		for(const conf of config){
			conf.maxRetry = 3;
			this[conf.func.name] = (args) => new Promise(async (resolve, reject) => {  
				callback(conf, args, resolve, reject);
			});
		};
	}
}

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
	let media = { body: data };
	const item = await drive.files.create({ resource, media, fields: 'id, parents' });
	console.log(`-> 	${name} file creating in the root folder.`);
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
	console.log(`deleted the ${name}(${fileId}) file`);
	return true;
};

const createRemoteFolder = async ({ drive, name, parentId, parentName }) => {
	const resource = { name, mimeType: "application/vnd.google-apps.folder", parents: [ parentId ] };
	const res = await drive.files.create({ resource });
	console.log(`-> ${name} remote folder created in the ${parentName} parent folder.`);
	return { name, id: res.data.id, parentName, parentId };
};

const createFileInFolder = async ({ drive, fileName, fileData, parentId, parentName }) => {
	const resource = { name: fileName, parents: [parentId] };
	const body = fileData;
	const media = { body };
	const res = await drive.files.create({ resource, media, fields: 'id' });
	console.log(`->		${fileName} remote file created in the ${parentName} folder.`);
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
		await drive.files.delete({ 'fileId': folderId });
		console.log(`deleted the ${folderName}(${folderId}) folder`);
	};
	const folders = await getRemoteFolderMetadata({ drive });
	if (folders.find(x => x.name === folderName)) {
		throw new Error(`failed to delete the ${folderName} folder`);
	}
	return true;
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
		let hasParent = process.google.folders.find( x => x.name === _parentName && x.parentId === parent.id);
		if (hasParent){
			parent = hasParent;
		} else {
			const parentId = parent.id;
			parent = await retryPolicy.createRemoteFolder({ drive, name: _parentName, parentId: parent.id, parentName: parent.name  });
			hasParent = process.google.folders.find( x => x.name === _parentName && x.parentId === parentId);
			if (!hasParent){
				process.google.folders.push(parent);
			}
		}
	};
	return parent;
};

const createRemoteFoldersAndFile = async ( { drive, path, rootFolder, rootDirName }) => {
	let pathInfo = fsPath.parse(path);
	const parent = await createRemoteFolders({ drive, pathInfo, rootFolder, rootDirName });
	let fileName =  pathInfo.base;
	if (!process.google.files.find( x => x.name === fileName && x.parentId === parent.id)) {
		const fileData = fs.createReadStream(path);
		const newFile = await retryPolicy.createFileInFolder( { drive, fileName, fileData, parentId: parent.id, parentName: parent.name } );
		process.google.files.push(newFile);
	}
	return true;
};

const retryPolicy = new RetryPolicy();
retryPolicy.config([ { 
	allowIdenticalCalls: false,
	getFunctionId: ({  fileName, parentId, parentName }) => {
		return `${fileName}${parentId}${parentName}`;
	},
	func: createFileInFolder
},{
	allowIdenticalCalls: false,
	getFunctionId: ({  name, parentId, parentName }) => {
		return `${name}${parentId}${parentName}`;
	},
	func: createRemoteFolder
},{
	allowIdenticalCalls: false,
	getFunctionId: ({  folderName }) => {
		return `${folderName}`;
	},
	func: deleteRemoteFolder
},{
	allowIdenticalCalls: false,
	getFunctionId: ({  name }) => {
		return `${name}`;
	},
	func: deleteRemoteFile
},{
	allowIdenticalCalls: false,
	getFunctionId: ({  name }) => {
		return `${name}`;
	},
	func: createRemoteRootFile
},{
	allowIdenticalCalls: false,
	getFunctionId: ({  name }) => {
		return `${name}`;
	},
	func: createRemoteFolder
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

		await retryPolicy.deleteRemoteFolder({ drive, folderName: rootDirName });

		let rootFolder = process.google.folders.find( x => x.name === rootDirName && x.parentName === "My Drive" );
		if (!rootFolder){
			await retryPolicy.deleteRemoteFile({ drive, name: "tempFile" });
			const tempFile = await retryPolicy.createRemoteRootFile({ drive, name: "tempFile", data: "" });
			rootFolder = await retryPolicy.createRemoteFolder({ drive, name: rootDirName, parentId: tempFile.parentId, parentName: tempFile.parentName  });
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
			const promise = createRemoteFoldersAndFile({ drive, path, rootFolder, rootDirName });
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