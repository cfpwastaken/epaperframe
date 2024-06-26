import { exec, execSync } from "node:child_process";
import { copyFile, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { convertCtoRaw } from "./convert.js";
import { createServer as createHttpServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";

// const file = process.argv[2] || "test.raw";
let lastFile = "";
const forcedFile = process.argv[2] || null;
const immichKey = process.env.IMMICH_KEY;
const immichServer = process.env.IMMICH_SERVER;
const allowedAlbums = process.env.IMMICH_ALBUMS.split(",");
const workTimes = process.env.WORK_TIMES;
const delay = parseInt(process.env.DELAY); // 10 minutes
let info = {next: new Date(), album: ""};
let memoryLaneInfo = [];

const server = createServer();
const httpServer = createHttpServer(async (req, res) => {
  if(req.url === "/") {
    res.writeHead(200, {
      "Content-Type": "text/html"
    });
    // Send the index.html file
    res.end(await readFile("webinterface/index.html"));
  } else if(req.url === "/script.js") {
    res.writeHead(200, {
      "Content-Type": "text/javascript"
    });
    res.end(await readFile("webinterface/script.js"));
  } else if(req.url === "/current.jpg") {
    // Send the current image, force the browser to not cache it
    if(!existsSync("pic.jpg")) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-cache"
    });
    const stream = createReadStream("pic.jpg");
    stream.pipe(res);
  } else if(req.url === "/info") {
    // Send the time until the next update
    res.writeHead(200, {
      "Content-Type": "application/json"
    });
    res.end(JSON.stringify(info));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.on("connection", async function(sock) {
	console.log("CONNECTED: " + sock.remoteAddress + ":" + sock.remotePort);
	let displaywidth = 600;
	let displayheight = 448;

  const timeUntilUpdate = calculateTimeForNextUpdate();
  sock.write(timeUntilUpdate.toString());
  sock.write("STARTDATA");

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
httpServer.listen(6958, () => {
  console.log("HTTP Server running");
});

function calculateTimeForNextUpdate() {
  if(workTimes == "always") {
    const now = new Date();
    let nextUpdate = new Date(now.getTime() + delay);
    const timeUntilUpdate = nextUpdate - now - (60 * 1000);
    info.next = nextUpdate;
    console.log("Time until next update:", timeUntilUpdate, "ms (forced from always)");
    return timeUntilUpdate;
  }
  // Calculate the amount of time until the display should be updated
  // Every delay seconds, but only within the work times, if it is outside of the work times, wait until the next day at the start of the work times
  const now = new Date();
  const workStart = new Date();
  const workEnd = new Date();
  workStart.setHours(parseInt(workTimes.split("-")[0].split(":")[0]));
  workStart.setMinutes(parseInt(workTimes.split("-")[0].split(":")[1]));
  workEnd.setHours(parseInt(workTimes.split("-")[1].split(":")[0]));
  workEnd.setMinutes(parseInt(workTimes.split("-")[1].split(":")[1]));
  let nextUpdate = new Date();
  if (now < workStart) {
    nextUpdate = workStart;
  } else if (now > workEnd) {
    nextUpdate = workStart;
    nextUpdate.setDate(nextUpdate.getDate() + 1);
  } else {
    nextUpdate = new Date(now.getTime() + delay);
  }
  const timeUntilUpdate = nextUpdate - now - (60 * 1000);
  info.next = nextUpdate;
  console.log("Time until next update:", timeUntilUpdate, "ms");
  return timeUntilUpdate;
}

async function getAllAlbums() {
  return (await fetch(immichServer + "albums", {
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
  return [(await fetch(immichServer + "albums/" + id, {
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
          width: asset.exifInfo.exifImageWidth,
          height: asset.exifInfo.exifImageHeight
        };
      }).filter(asset => asset.type === "IMAGE" /*&& ["16:9", "4:3"].includes(calculateAspectRatio(asset.width, asset.height))*/)
    }
  })[0]
}

async function downloadAsset(id, toFile) {
  const arrBuf = await fetch(immichServer + "assets/" + id + "/original", {
    headers: {
      "x-api-key": immichKey
    },
  }).then(res => res.arrayBuffer());
  const buf = Buffer.from(arrBuf);
  await writeFile(toFile, buf);
}

async function getMemoryLane() {
	const day = new Date().getDate();
	const month = new Date().getMonth() + 1;

	const res = await fetch(immichServer + "assets/memory-lane?day=" + day + "&month=" + month, {
		headers: {
			"x-api-key": immichKey
		}
	}).then(res => res.json());
	return res;
}

async function getAlbumOfAsset(id) {
	const res = await fetch(immichServer + "albums?assetId=" + id, {
		headers: {
			"x-api-key": immichKey
		}
	}).then(res => res.json());
	return res;
}

// function calculateAspectRatio(width, height) {
//   const gcd = (a, b) => (b == 0) ? a : gcd(b, a % b);
//   const r = gcd(width, height);
//   return width / r + ":" + height / r;
// }

async function getEligiblePicturesFromMemoryLane() {
	const memoryLane = await getMemoryLane();
	console.log(memoryLane);
	if(memoryLane.length == 0) return [];
	let pics = [];
	for(const lane of memoryLane) {
		const laneTitle = lane.title;
		for(const pic of lane.assets) {
			if(pic.type != "IMAGE") continue;
			// if(!["16:9", "4:3"].includes(calculateAspectRatio(pic.width, pic.height))) continue;
			const albumsIn = await getAlbumOfAsset(pic.id);
			if(albumsIn.length == 0) continue;
			if(albumsIn.filter(a => allowedAlbums.includes(a.albumName)).length == 0) continue;
			if(memoryLaneInfo.filter(m => m.id == pic.id && m.expire < new Date()).length > 0) continue;
			// Remove memorylane info if it exists
			memoryLaneInfo = memoryLaneInfo.filter(m => m.id != pic.id);
			// Add new memorylane info
			memoryLaneInfo.push({ id: pic.id, expire: new Date(new Date().getTime() + 1000 * 60 * 60 * 3) }); // 3 hours
			console.log(pic);
			console.log("Albums in", albumsIn);
			pics.push({ id: pic.id, title: laneTitle });
		}
	}
	return pics;
}

getEligiblePicturesFromMemoryLane()

async function chooseNewImage() {
	try {
		if(Math.random() < 0.3) {
			const memoryLanePics = await getEligiblePicturesFromMemoryLane();
			if(memoryLanePics.length > 0) {
				const pic = memoryLanePics[Math.floor(Math.random() * memoryLanePics.length)];
				await downloadAsset(pic.id, "memory.jpg");
				console.log("Downloaded new image from memory lane");
				info.album = "Memory Lane: " + pic.title;
				return;
			}
		}
		const allAlbums = await getAllAlbums();
		const albums = allAlbums.filter(a => a.assetCount > 0 && allowedAlbums.includes(a.name));
		let gotPic = false;
		let asset;
		while(!gotPic) {
			const albumInfo = albums[Math.floor(Math.random() * albums.length)];
			console.log("Chose album", albumInfo.name);
			const album = await getAlbum(albumInfo.id);
			if(album.assets.length == 0) continue;
			asset = album.assets[Math.floor(Math.random() * album.assets.length)];
			gotPic = true;
			info.album = albumInfo.name;
		}
		await downloadAsset(asset.id, "pic.jpg");
		console.log("Downloaded new image");
	} catch(e) {
		console.error(e);
		await copyFile("/app/immicherror.jpg", "pic.jpg");
	}
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
