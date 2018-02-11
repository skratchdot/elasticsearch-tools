jest.mock('../../lib/exporter.js');

test('es-export-alises', () => {
  const exporterMock = require('../../lib/exporter');
  require('../../lib/es-export-aliases');
  expect(exporterMock.indicesExport.mock.calls).toMatchSnapshot();
});
