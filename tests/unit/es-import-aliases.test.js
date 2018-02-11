jest.mock('../../lib/importer.js');

test('es-import-alises', () => {
  const importerMock = require('../../lib/importer');
  require('../../lib/es-import-aliases');
  expect(importerMock.indicesImport.mock.calls).toMatchSnapshot();
});
