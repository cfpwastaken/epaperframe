import { exec, execSync } from "node:child_process";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { convertCtoRaw } from "./convert.js";

// const file = process.argv[2] || "test.raw";
let lastFile = "";
const forcedFile = process.argv[2] || null;
const immichKey = process.env.IMMICH_KEY;
const immichServer = process.env.IMMICH_SERVER;
const allowedAlbums = process.env.IMMICH_ALBUMS.split(",");

const server = createServer();
server.on("connection", async function(sock) {
	console.log("CONNECTED: " + sock.remoteAddress + ":" + sock.remotePort);
	let displaywidth = 600;
	let displayheight = 448;
  let file;
  if(!forcedFile) {
    const files = (await readdir("pics")).filter(f => f.endsWith(".raw"));
    file = files[Math.floor(Math.random() * files.length)];
    while (file === lastFile) {
      file = files[Math.floor(Math.random() * files.length)];
    }
    file = join("pics", file);
    lastFile = file;
  } else {
    file = forcedFile;
    const start = new Date();
    await makeNewImage();
    const end = new Date();
    console.log("Made new image in", end - start, "ms");
  }
  console.log("Sending file", file);
	const data = await readFile(file);

  // send data Buffer in 512 chunks, with a 50ms delay
  let offset = 0;
  const chunkSize = 512;

  function sendChunk() {
    const end = Math.min(offset + chunkSize, data.length);
    if (offset < end) {
      sock.write(data.slice(offset, end));
      offset = end;
      setTimeout(sendChunk, 10); // 50ms delay
    } else {
      sock.end(); // All chunks sent, close the connection
			console.log("Finished sending data")
    }
  }

  sendChunk(); // Start sending chunks
});

server.listen(6957, "0.0.0.0", () => {
	console.log("TCP Server running");
});

async function getAllAlbums() {
  return (await fetch(immichServer + "album", {
    headers: {
      "x-api-key": immichKey
    },
  }).then(res => res.json())).map(a => {
    return {
      name: a.albumName,
      id: a.id,
      assetCount: a.assetCount
    }
  })
}

async function getAlbum(id) {
  return [(await fetch(immichServer + "album/" + id, {
    headers: {
      "x-api-key": immichKey
    }
  }).then(res => res.json()))].map(a => {
    return {
      name: a.albumName,
      id: a.id,
      assetCount: a.assetCount,
      assets: a.assets.map(asset => {
        return {
          id: asset.id,
          type: asset.type,
        };
      }).filter(asset => asset.type === "IMAGE")
    }
  })[0]
}

async function downloadAsset(id, toFile) {
  const arrBuf = await fetch(immichServer + "asset/file/" + id + "?isThumb=false&isWeb=true", {
    headers: {
      "x-api-key": immichKey
    },
  }).then(res => res.arrayBuffer());
  const buf = Buffer.from(arrBuf);
  await writeFile(toFile, buf);
}

async function chooseNewImage() {
  const allAlbums = await getAllAlbums();
  const albums = allAlbums.filter(a => a.assetCount > 0 && allowedAlbums.includes(a.name));
  const albumInfo = albums[Math.floor(Math.random() * albums.length)];
  console.log("Chose album", albumInfo.name);
  const album = await getAlbum(albumInfo.id);
  const asset = album.assets[Math.floor(Math.random() * album.assets.length)];
  await downloadAsset(asset.id, "pic.jpg");
  console.log("Downloaded new image");
}

async function makeNewImage() {
  await chooseNewImage();
  execSync("gimp -i -b \"(convert-to-epaper \\\"pic.jpg\\\" \\\"pic.bmp\\\")\" -b '(gimp-quit 0)'");
  execSync("./converterto7color \"pic.bmp\" \"pic.c\"")
  await convertCtoRaw("pic.c", "pic.raw");
  // await unlink("pic.jpg");
  await unlink("pic.bmp");
  await unlink("pic.c");
  console.log("Converted new image");
}
