jest.mock('../../lib/exporter.js');

test('es-export-settings', () => {
  const exporterMock = require('../../lib/exporter');
  require('../../lib/es-export-settings');
  expect(exporterMock.indicesExport.mock.calls).toMatchSnapshot();
});
