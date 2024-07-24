const { merge } = require("webpack-merge");
const commonConfig = require("./webpack.common.js");
const ProgressBarPlugin = require('progress-bar-webpack-plugin'); // Importe o ProgressBarPlugin aqui

module.exports = (envVars) => {
  const { env } = envVars;
  const envConfig = require(`./webpack.${env}.js`);
  const config = merge(commonConfig, envConfig);
  
  // Adicione o ProgressBarPlugin à lista de plugins
  config.plugins.push(new ProgressBarPlugin());

  return config;
};
