from sqlalchemy_schemadisplay import create_schema_graph

# import needed so the metadata is completely loaded
from back.src.entity import *
from back.src.driver.database import db

# hack to make this work with sqlalchemy 2.0
db.metadata.bind = None
# create the pydot graph object by autoloading
# all tables via a bound metadata object
graph = create_schema_graph(metadata=db.metadata,
                            show_datatypes=True,
                            show_indexes=True,
                            # Don't try to join the relation lines together
                            concentrate=False
                            )

graph.write_svg('dbschema.svg')