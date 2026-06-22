export default {
  '*': 'prettier --check --ignore-unknown',
  '*.{js,jsx,ts,tsx,mts,cts,mjs,cjs,vue}':
    'eslint --config ./eslint.config.mjs',
  '*.{css,scss,sass,vue}': 'stylelint',
};
