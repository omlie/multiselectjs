define INFOTEXT
Targets:
  help         - display this text
  dependencies - download and install necessary js packages
  dist         - build multiselectjs distribution
  test	       - run tests
  docs         - build docs, tutorial
  clean        - remove generated/built files
endef

export INFOTEXT

help:
	@echo "$$INFOTEXT"

.PHONY: dirs dist tangle docs pages test

EMACS := emacs

LIBRARY_ORGS := \
	org/multiselect_library.org \
	org/selection_geometries.org \
	org/ipe.org 

# files generated from source org files
LIBRARY_HTMLS := $(LIBRARY_ORGS:.org=.html)
LIBRARY_TANGLED := $(LIBRARY_ORGS:.org=.tangled)
# .tangled are just empty marker files for the make file

# Generated documentation
DOCS_ORGS := \
	org-docs/index.org \
	org-docs/tutorial/tutorial.org \
	org-docs/api_reference/api_reference.org
DOCS_HTMLS := $(DOCS_ORGS:.org=.html)
DOCS_TANGLED := $(DOCS_ORGS:.org=.tangled)


# deployable js
DIST_JS := \
	dist/multiselect.js \
	dist/multiselect.debug.js \
	dist/multiselect_ordered_geometries.js \
	dist/multiselect_dom_geometries.js \
	dist/multiselect_ipe.js

dependencies:
	npm install

$(DIST_JS): tangle $(LIBRARY_TANGLED)

dist: $(DIST_JS) 
	npm run build

docs: $(LIBRARY_HTMLS) $(DOCS_HTMLS)

%.tangled: %.org
	$(EMACS) --batch -l org-publish.el $< --eval "(org-tangle)"
	touch $@

%.html: %.org %.tangled
	$(EMACS) --batch -l org-publish.el $< --eval "(publish-org-to-html \".\")"

testmain: TESTFILE = file:///Users/jarvi/bgits/multiselect/test/testindex.html
testmain: dist $(GEN_TEST)
	osascript -e "$$RELOADER"

testipe: TESTFILE = file:///Users/jarvi/bgits/multiselect/test/ipetests.html
testipe: tangle $(GEN_TEST)
	osascript -e "$$RELOADER"

test: testmain testipe


# A script for reloading a particular file on chrome

define RELOADER
set u to "$(TESTFILE)"
tell application "Google Chrome"
    repeat with w in windows
        set i to 0
        repeat with t in tabs of w
            set i to i + 1
            if URL of t is u then
                set active tab index of w to i
                set index of w to 1
                tell t to reload
                activate
                return
            end if
        end repeat
    end repeat
    open location u
    activate
end tell
endef

export RELOADER
reload:
	osascript -e "$$RELOADER"

# Variables for all generated files
# These depend on the generated files nevertheless being committed in

# Anything committed in certain directories
GEN_JS := $(shell git ls-files -- js | tr '\n' ' ')
GEN_TEST := $(shell git ls-files -- test | tr '\n' ' ')
GEN_DOCS := $(shell git ls-files -- org-docs | grep --invert-match \.org | tr '\n' ' ')
# ignore .org files in org-docs and subdirectories, they are not generated

# These are not committed, but they are generated
GEN_DIST := dist\*.js

GEN_TO_COMMIT = $(GEN_TEST) $(GEN_JS) 

# hide generated files from git until further notice
hide:
	git update-index --skip-worktree $(GEN_TO_COMMIT)

# unhide generated files
unhide:
	git update-index --no-skip-worktree $(GEN_TO_COMMIT)

clean:
	rm -fr *~
	rm -f $(GEN_JS) $(GEN_TEST) $(GEN_DIST)
	rm -f $(LIBRARY_TANGLED) $(GENERATED_TEST_FILES)

squeaky: clean
	rm -f $(GEN_DOCS)


# pages: docs dist
# 	rsync -v dist-docs/index/index.html ../multiselectjs-pages/index.html
# 	mkdir -p ../multiselectjs-pages/docs
# 	mkdir -p ../multiselectjs-pages/docs/tutorial
# 	rsync -v dist-docs/tutorial/* ../multiselectjs-pages/docs/tutorial/
# 	mkdir -p ../multiselectjs-pages/docs/api_reference
# 	rsync -v dist-docs/api_reference/* ../multiselectjs-pages/docs/api_reference/
# 	mkdir -p ../multiselectjs-pages/examples
# 	mkdir -p ../multiselectjs-pages/examples/demo
# 	rsync -v examples/demo/* ../multiselectjs-pages/examples/demo/
# 	mkdir -p ../multiselectjs-pages/dist
# 	rsync -v dist/multiselect.js ../multiselectjs-pages/dist

