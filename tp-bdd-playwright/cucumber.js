module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'features/step-definitions/**/*.js',
      'features/support/**/*.js'
    ],
    paths: ['features/**/*.feature'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    publishQuiet: true
  }
}
