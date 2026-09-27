import fs from "fs";

try {
  const fd = fs.openSync("C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data\\lockfile", "r+");
  fs.closeSync(fd);
  console.log("File is NOT locked. We can open read/write!");
} catch (e) {
  console.log("File IS LOCKED:", e.message);
}
