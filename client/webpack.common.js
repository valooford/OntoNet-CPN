const path = require('path');
const ForkTsChecherWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // entry
  resolve: {
    extensions: ['.ts', '.js', '.json'], // the default extensions list (.js must be included)
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true, // turn off type checking as it's slow
        },
      },
    ],
  },
  plugins: [
    new ForkTsChecherWebpackPlugin({
      eslint: {
        files: './src/**/*.ts', // files which are being linted
      },
    }), // enable type checking in a separate process
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
