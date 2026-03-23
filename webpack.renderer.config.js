const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'postcss-loader' } 
    ],
});

module.exports = {
  // 👇 AVISA AO WEBPACK QUE É UM RENDERER DO ELECTRON 👇
  target: 'electron-renderer',
  
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.css'],
  },
  
  // 👇 MANDA O WEBPACK IGNORAR O SQLITE NA HORA DE EMPACOTAR 👇
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
  },
};