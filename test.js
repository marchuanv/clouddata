const cloudData = require("./index.js");
( async() => {
    await cloudData.upload({
        rootDirName: "minecraft",
        rootDirPath: "D:\\",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZx8xxwEYJDAg4\n1M58sULcU5cQexh3NWfGR9kRKsEa5J+RWqQR8Eu9UI5n7+UddE/utM4oVyn6/xx5\npIjU7/YlqTw0TbdjA4asBSZo08CYT3He8/6FWVrisr5NwsoZjOTaWyVdJr1RyGVq\nHgNg2UsWoHQEix6vMtcHP4zB3NgSLpZeEqszOSqnjnqLErQlYLyz28USgqWFtv0R\nG9cnku5P+xwzv2kR8dBJr5FyHMLaXx3+sIBXegenI5eI8brH7XtiWgp153lmE1OA\n65p2Bofsb8ULPOgH4k8gQ/mefkfbmAUyE1RykP6f5SC80huFiqbjsu59pSm8WDs8\ne0xTFHPLAgMBAAECggEAHaV9ng5l0heuPBqWpkZcL/KzhFte15iFpZ2zVNJrwP4D\nXzfcupKbX2d41MPUZU3HnSrhNbi8IKXu/OqB8J9EUnViZGj5Kk8DNwWVJo9wKUzj\nlIpwbo/P7DVuZ7peUPevJQN+XAt8YxhhqMgZeaHajoWnaDrT0w3Xk4+mWLd1NmfV\nVyaR67twYrnvps3AMX3E32ei4s43KtLnD+WJrhZ3Oij8guTQQ2uCl2oMtti/g5m9\nbTHMbRz81IJ8oFk2NitPsEtE3hnvH1/UXXfW3HMKYCar3P3ZbyzYkgMIY0WnEyir\nnca3H1RpUnXJ89RCY3TJemphnpWGry/4UsN5Z/gtjQKBgQDHr/kKKjoRJxiIq1/d\nnfYqfBCqHCGE/IHgsH6FzePLxNVkZLOvxedk+ilUUwZfHfY5plJImgOqS1gFVGzN\nC7L9xmrrtdMzhJnOyqdfVg5IKhEwjNqkb9aCmjKvJN2eNdKTPAJH6S55CdbLaft1\nDFuOwUUXNGxXx/shw/LILoVfxQKBgQDFJar6Fy7GD0K5mfgNkNQouwUZbw7F17Da\nY2DVjqVfVkolRDRBNa0Sbti2aWi/SvUvdSp3WB+x+QBhlwGCGyUwJTroIwMoPcoL\nd+f4s0Qk08NvC9arreIA7I+JBIXMY/nEIn6RKRlnREbBKmQqaj9QuNtbM81Vw7i+\nhSuz5sSuTwKBgGHC2ETOuZDuOAepBw0DqaHRDYOKtCpcSOWM4tR1ISIAoow89O+I\nDyoTgypiX0sv6vz8XWpn5IV5z4UEeSPFp4KwomX1pYmiUH66HkkBY4qW9cV0IBLD\nIhzcixXOEaXEKeylQ2SbV4Iwe/UoVNBQFX8FReL/ak9re5pjSTgR9oAVAoGABkHL\ny2Qw99hEJd/dH5EZKrHE16nOrjjKRCQjTqPYW85BTC19+xPZCly6RA/UYz3dykPN\ntTv2xY9Bk9dXFOoHpB+KXxO9ZemQIA0OL7aA0yplaYDWr1w1cBIR/CdIl9QUeUUe\n/zxusfhYxoix5Sa6G7XCQILEYZR0qJdRa8RHOcECgYEAn51asTl12KIp9WlyQNu9\nmkogsk0EqG1MQoXrzcljAOrSCsI2QQCRfaCrhI9PoxN2wWOFtzq48+9gQsYSjKBP\nJeUV6kEPXUeuTL2wSXWfrZu3Plt4vwAt4jeoJanslHl20xinFKrzn8Vwipa07nqS\n3xZQjSt0Vob2A9XZHfuKsZY=\n-----END PRIVATE KEY-----\n",
        privateKeyId: "55a4ca5c54d330c5f2ce4788df210b7f8dcb3171"
    });
})().catch((err)=>{
	console.error(err);
});
