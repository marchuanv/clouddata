const { google } = require("googleapis");
const utils = require("utils");
const fs = require("fs");
const fsPath = require("path");
const privateKey = require("./privatekey.json");
const CONTAINER_GOOGLE_PK = process.env.CONTAINER_GOOGLE_PK || privateKey.CONTAINER_GOOGLE_PK;
const CONTAINER_GOOGLE_PK_ID = process.env.CONTAINER_GOOGLE_PK_ID || privateKey.CONTAINER_GOOGLE_PK_ID;
const lineBreaks = new RegExp(/\\n/,"g");
const rootName = "minecraft";

process.google = { files: [], folders: [] };

const initialise = async() => {
	lineBreaks.lastIndex = 0;
	const credentials = {
		"type": "service_account",
		"project_id": "api-project-927120566382",
		"private_key_id": "55a4ca5c54d330c5f2ce4788df210b7f8dcb3171",
		"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZx8xxwEYJDAg4\n1M58sULcU5cQexh3NWfGR9kRKsEa5J+RWqQR8Eu9UI5n7+UddE/utM4oVyn6/xx5\npIjU7/YlqTw0TbdjA4asBSZo08CYT3He8/6FWVrisr5NwsoZjOTaWyVdJr1RyGVq\nHgNg2UsWoHQEix6vMtcHP4zB3NgSLpZeEqszOSqnjnqLErQlYLyz28USgqWFtv0R\nG9cnku5P+xwzv2kR8dBJr5FyHMLaXx3+sIBXegenI5eI8brH7XtiWgp153lmE1OA\n65p2Bofsb8ULPOgH4k8gQ/mefkfbmAUyE1RykP6f5SC80huFiqbjsu59pSm8WDs8\ne0xTFHPLAgMBAAECggEAHaV9ng5l0heuPBqWpkZcL/KzhFte15iFpZ2zVNJrwP4D\nXzfcupKbX2d41MPUZU3HnSrhNbi8IKXu/OqB8J9EUnViZGj5Kk8DNwWVJo9wKUzj\nlIpwbo/P7DVuZ7peUPevJQN+XAt8YxhhqMgZeaHajoWnaDrT0w3Xk4+mWLd1NmfV\nVyaR67twYrnvps3AMX3E32ei4s43KtLnD+WJrhZ3Oij8guTQQ2uCl2oMtti/g5m9\nbTHMbRz81IJ8oFk2NitPsEtE3hnvH1/UXXfW3HMKYCar3P3ZbyzYkgMIY0WnEyir\nnca3H1RpUnXJ89RCY3TJemphnpWGry/4UsN5Z/gtjQKBgQDHr/kKKjoRJxiIq1/d\nnfYqfBCqHCGE/IHgsH6FzePLxNVkZLOvxedk+ilUUwZfHfY5plJImgOqS1gFVGzN\nC7L9xmrrtdMzhJnOyqdfVg5IKhEwjNqkb9aCmjKvJN2eNdKTPAJH6S55CdbLaft1\nDFuOwUUXNGxXx/shw/LILoVfxQKBgQDFJar6Fy7GD0K5mfgNkNQouwUZbw7F17Da\nY2DVjqVfVkolRDRBNa0Sbti2aWi/SvUvdSp3WB+x+QBhlwGCGyUwJTroIwMoPcoL\nd+f4s0Qk08NvC9arreIA7I+JBIXMY/nEIn6RKRlnREbBKmQqaj9QuNtbM81Vw7i+\nhSuz5sSuTwKBgGHC2ETOuZDuOAepBw0DqaHRDYOKtCpcSOWM4tR1ISIAoow89O+I\nDyoTgypiX0sv6vz8XWpn5IV5z4UEeSPFp4KwomX1pYmiUH66HkkBY4qW9cV0IBLD\nIhzcixXOEaXEKeylQ2SbV4Iwe/UoVNBQFX8FReL/ak9re5pjSTgR9oAVAoGABkHL\ny2Qw99hEJd/dH5EZKrHE16nOrjjKRCQjTqPYW85BTC19+xPZCly6RA/UYz3dykPN\ntTv2xY9Bk9dXFOoHpB+KXxO9ZemQIA0OL7aA0yplaYDWr1w1cBIR/CdIl9QUeUUe\n/zxusfhYxoix5Sa6G7XCQILEYZR0qJdRa8RHOcECgYEAn51asTl12KIp9WlyQNu9\nmkogsk0EqG1MQoXrzcljAOrSCsI2QQCRfaCrhI9PoxN2wWOFtzq48+9gQsYSjKBP\nJeUV6kEPXUeuTL2wSXWfrZu3Plt4vwAt4jeoJanslHl20xinFKrzn8Vwipa07nqS\n3xZQjSt0Vob2A9XZHfuKsZY=\n-----END PRIVATE KEY-----\n",
		"client_email": "ragetoast@api-project-927120566382.iam.gserviceaccount.com",
		"client_id": "101652556790738375238",
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/ragetoast%40api-project-927120566382.iam.gserviceaccount.com"
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

const createRootFile = async ( { drive, name, data } ) => {
	const resource = { name };
	console.log(`-> 	creating ${name} file in the root folder.`);
	let media = { body: data };
	const item = await drive.files.create({ resource, media, fields: 'id, parents' });
	return { id: item.data.id, name, data, parentId: item.data.parents[0], parentName: "My Drive" };
};

const deleteFolder = async ( { drive, folderName } ) => {

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

const createFolder = async ({ drive, name, parentId, parentName }) => {
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

const getFolderMetadata = async ( { drive , pageToken = "" }) => {
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
		fileMetadata =  fileMetadata.concat(await getFolderMetadata({ drive, pageToken: res.data.nextPageToken }));
	}
	for(const item of fileMetadata){
		let res = await drive.files.get({ fileId: item.parentId });
		item.parentName = res.data.name;
	};
	
	return fileMetadata;
}

const getFileMetadata = async ( { drive, pageToken = "" }) => {
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
		fileMetadata =  fileMetadata.concat(await getFileMetadata({ drive, pageToken: res.data.nextPageToken }));
	}
	return fileMetadata;
}

( async() => {

	const { drive } = await initialise();

	let rootFolder = process.google.folders.find( x => x.name === rootName && x.parentName === "My Drive" );
	if (!rootFolder){
		const tempFile = await createRootFile({ drive, name: "tempFile",data: ""});
		await deleteAllFiles({drive});
		await deleteFolder({ drive, folderName: rootName });
		rootFolder = await createFolder({ drive, name: rootName, parentId: tempFile.parentId, parentName: tempFile.parentName  });
	}

	if (process.google.folders.length === 0){
		process.google.folders  = await getFolderMetadata({ drive });
	}

	if (process.google.files.length === 0){
		process.google.files =  await getFileMetadata({ drive });
		for (const file of process.google.files){
			const folder = process.google.folders.find( x => x.id === file.parentId);
			file.parentName = folder.name;
		};
	}

	let paths = fs.readFileSync("./sync/minecraft.index","utf8");
	if (paths){
		paths  = paths.split("\r\n");
	}
	
	for(let path of paths) {
		let pathSplit = path.replace("c:","").replace("..","").replace("C:","").split("\\").filter(x => x).map(x=>x.toLowerCase());
		let fileName =  pathSplit[pathSplit.length-1];
		let folderNames = pathSplit.filter( x => x !== fileName);
		let parent = rootFolder;
		for(const _parentName of folderNames){
			const hasParent = process.google.folders.find( x => x.name === _parentName && x.parentId === parent.id);
			if (hasParent){
				parent = hasParent;
			} else {
				parent = await createFolder({ drive, name: _parentName, parentId: parent.id, parentName: parent.name  });
				process.google.folders.push(parent);
			}
		};
		if (!process.google.files.find( x => x.name === fileName && x.parentId === parent.id)) {
			const fileData = fs.createReadStream(`${__dirname}\\minecraft\\${path}`);
			const newFile = await createFileInFolder( { drive, fileName, fileData, parentId: parent.id, parentName: parent.name } );
			process.google.files.push(newFile);
		}
	};
	
	
})().catch((err)=>{
	console.error(err);
});

// module.exports = async function (context, req) {
//     context.log('JavaScript HTTP trigger function processed a request.');

//     const name = (req.query.name || (req.body && req.body.name));
//     const responseMessage = name
//         ? "Hello, " + name + ". This HTTP triggered function executed successfully."
//         : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

//     context.res = {
//         // status: 200, /* Defaults to 200 */
//         body: responseMessage
//     };
// }
