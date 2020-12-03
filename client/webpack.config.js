const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = ({ dev } = {}) => {
  const config = {
    // entry
    plugins: [
      new CleanWebpackPlugin(), // cleans output folder
      new HtmlWebpackPlugin({ title: 'OntoNet' }), // generates index.html file
    ],
    optimization: {
      runtimeChunk: 'single', // split runtime code into separate chunk
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      // filename
    },
  };
  if (dev) {
    config.mode = 'development';
    config.entry = { main: './src/index.js' };
    config.devtool = 'eval-cheap-module-source-map'; // source maps for development
    // webpack-dev-server configuration
    config.devServer = {
      contentBase: './dist', // obtain files from output folder
      hot: true, // enabling hot reload
      open: true, // open in default web browser
    };
    config.optimization.removeEmptyChunks = false; // removing unwanted optimizations (2)
    config.optimization.splitChunks = false;
    config.output.filename = '[name].js'; // main.js
    config.output.pathinfo = false; // no path info generation
  } else {
    config.entry = {
      main: {
        import: './src/index.js',
        dependOn: 'vendors', // share dependencies from vendors
      },
      vendors: 'jquery', // vendors chunk contains all dependencies
    };
    config.optimization.moduleIds = 'deterministic'; // disable module.id incrementing by resolving order (hashing);
    config.output.filename = '[name].[contenthash].js'; // main.js
  }

  return config;
};
