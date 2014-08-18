# elasticsearch-tools

A collection of elasticsearch command line tools for doing things like bulk importing/exporting
and exporting/importing mappings.

It was created because some of the existing import/export tools ran too slow on my machine. Using
the new bulk API seemed to speed things up dramatically.  The other tools I used also weren't
exporting _parent and _routing fields.


## Installation

```bash
npm install -g elasticsearch-tools
```

After installing, you will have access to the following command line tools:

#### Exporting
- es-export-bulk
- es-export-mappings
- es-export-settings
- es-export-aliases

#### Importing
- es-import-bulk
- es-import-mappings
- es-import-settings
- es-import-aliases


## Other Elasticsearch Tools

#### Imports / Exports
- [elasticdump](https://github.com/taskrabbit/elasticsearch-dump)
- [elasticsearch-exporter](https://github.com/mallocator/Elasticsearch-Exporter)


## License

Copyright (c) 2014 skratchdot  
Licensed under the MIT license.
