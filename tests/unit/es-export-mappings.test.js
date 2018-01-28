jest.mock('../../lib/exporter.js');

test('es-export-mappings', () => {
  const exporterMock = require('../../lib/exporter');
  require('../../lib/es-export-mappings');
  expect(exporterMock.indicesExport.mock.calls).toMatchSnapshot();
});
