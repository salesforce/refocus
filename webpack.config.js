/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * NOTE: we do not use webpack in production. Use it for front development with
 * with hot reload
 */
'use strict';
const pe = process.env; // eslint-disable-line no-process-env
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'eval-source-map',
  entry: [
    'webpack-hot-middleware/client?reload=true',
    path.join(__dirname, 'view/perspective/app.js'),
  ],
  output: {
    path: path.join(__dirname, '/public/perspective/'),
    filename: 'app.js',
    publicPath: '/perspective',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'view/perspective/perspective.pug',
      inject: 'body',
      filename: 'index.html',
      googleAnalytics: {
        trackingId: pe.GOOGLE_ANALYTICS_ID || 'N/A',
        pageViewOnLoad: true,
      },
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['react', 'es2015', 'stage-0', 'react-hmre'],
        },
      },
      {
        test: /\.json?$/,
        loader: 'json',
      },
      {
        test: /\.css$/,
        loader:
          'style!css?modules&localIdentName=[name]---[local]---[hash:base64:5]',
      },
    ],
  },
};
