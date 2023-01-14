const path = require('path');
const shared = require('./shared.webpack.config');

module.exports = {
  ...shared,
  entry: {
    'markdownPreview': path.join(__dirname, '..', 'src', 'markdownPreview', 'markdownPreview.ts'),
  },
  output: {
    path: path.join(__dirname, '..', 'dist'),
    filename: '[name].bundle.js'
  }
};
