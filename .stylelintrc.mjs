export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'color-hex-length': null,
    'value-keyword-case': ['lower', { ignoreKeywords: ['BlinkMacSystemFont'] }],
    'scss/dollar-variable-empty-line-before': null,
  },
};
