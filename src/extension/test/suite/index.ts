import path from "path";
import Mocha from "mocha";
import { glob } from "glob";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname, "..");

  return glob("**/**.test.js", { cwd: testsRoot }).then((files) => {
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    return new Promise((resolve, reject) => {
      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}
