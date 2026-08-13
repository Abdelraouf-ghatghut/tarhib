module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: { module: "commonjs", esModuleInterop: true, strict: true } }] },
};
