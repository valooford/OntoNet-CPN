const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  entry: { main: './src/index.ts' },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]--[name]_[hash:base64:5]',
              },
            },
          },
        ],
      },
    ],
  },
  devtool: 'eval-cheap-module-source-map', // source maps for development
  // webpack-dev-server configuration
  devServer: {
    contentBase: './dist', // obtain files from output folder
    // hot: true, // enabling hot reload
    open: true, // open in default web browser
  },
  optimization: { removeEmptyChunks: false, splitChunks: false }, // removing unwanted optimizations (2)
  output: {
    filename: '[name].js', // main.js
    pathinfo: false, // no path info generation},
  },
});
