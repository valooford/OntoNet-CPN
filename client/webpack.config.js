const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: { main: './src/index.js' },
  plugins: [
    new CleanWebpackPlugin(), // cleans output folder
    new HtmlWebpackPlugin({ title: 'OntoNet' }), // generates index.html file
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // main.js
  },
};
