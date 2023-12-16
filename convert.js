import { readFile, writeFile } from "fs/promises";

// let f = await readFile(process.argv[2] || "test.bin", "utf-8");

export async function convertCtoRaw(file, output) {
	// retrieve size
	let f = await readFile(file, "utf-8");
	let size = f.match(/\/\/ 7 Color Image Data [0-9]+\*[0-9]+/g)[0].match(/[0-9]+\*[0-9]+/g)[0].split("*");
	let width = size[0];
	let height = size[1];
	console.log(`Width: ${width}, Height: ${height}`);
	f = f.replace(/\/\/ 7 Color Image Data [0-9]+\*[0-9]+ \r\nconst unsigned char Image7color\[[0-9]+\] = {\r\n/g, "");
	f = f.replace(/\r\n};\r\n/g, "")
	f = f.replace(/0x/g, "")
	f = f.replace(/,/g, "")
	f = f.replace(/\r\n/g, "")
	
	// make the huge hex string into actual data
	let raw = Buffer.from(f, "hex");
	// barr format: bytearray(b'\x00......');
	let barr = "image = bytearray(b'\\x" + f.split(/(..)/g).filter(s => s).join("\\x") + "')";
	
	await writeFile(output, raw, "utf-8");
}
// await writeFile("test.py", barr, "utf-8");

// console.log("Written to test.raw and test.py");
// console.log("Usage:")
// console.log(`from test import image`);
// console.log(`fbuf = framebuf.FrameBuffer(image, ${width}, ${height}, framebuf.GS4_HMSB)`);
// console.log(`display.blit(fbuf, 0, 0)`);

// convertCtoRaw(process.argv[2], process.argv[3]);