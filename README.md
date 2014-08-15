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

- es-bulk-export
- es-bulk-import
- es-mapping-export
- es-mapping-import


## Other Elasticsearch Tools

#### Imports / Exports
- [elasticdump](https://github.com/taskrabbit/elasticsearch-dump)
- [elasticsearch-exporter](https://github.com/mallocator/Elasticsearch-Exporter)


## License

Copyright (c) 2014 skratchdot  
Licensed under the MIT license.
