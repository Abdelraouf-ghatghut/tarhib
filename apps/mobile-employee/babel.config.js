module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 moved its Babel transform to react-native-worklets —
    // must stay last in the plugins list per its own docs.
    plugins: ['react-native-worklets/plugin']
  };
};
