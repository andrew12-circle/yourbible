/** Browser shim — youtube-transcript-plus only uses fs for optional FsCache (unused by default). */
const fs = {
  mkdir: async () => undefined,
  readFile: async () => {
    throw new Error("ENOENT");
  },
  writeFile: async () => undefined,
  unlink: async () => undefined,
};

export default fs;
