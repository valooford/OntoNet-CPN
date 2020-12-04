const { merge } = require('webpack-merge');
const common = require('./webpack.common');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = merge(common, {
  entry: {
    main: {
      import: './src/index.ts',
      dependOn: 'vendors', // share dependencies from vendors
    },
    vendors: 'jquery', // vendors chunk contains all dependencies
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // extracting all styles into file (per chunk)
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(), // cleans output folder
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
  ],
  // devtool: 'source-map', // debugging in prod
  optimization: { moduleIds: 'deterministic' }, // disable module.id incrementing by resolving order (hashing);
  output: { filename: '[name].[contenthash].js' }, // main.js
});
