default: compiled_webrtc_adapter.js

BUILD_TOOLS:=build_tools
CLOSURE_COMPILER_VERSION:=20161024
CLOSURE_COMPILER:=$(BUILD_TOOLS)/closure-compiler-v$(CLOSURE_COMPILER_VERSION).jar

$(CLOSURE_COMPILER):
	mkdir -p $(BUILD_TOOLS)
	cd $(BUILD_TOOLS); wget "http://dl.google.com/closure-compiler/compiler-$(CLOSURE_COMPILER_VERSION).zip"
	cd $(BUILD_TOOLS); unzip -o compiler-$(CLOSURE_COMPILER_VERSION).zip
	cd $(BUILD_TOOLS); rm COPYING README.md compiler-$(CLOSURE_COMPILER_VERSION).zip

COMPILE_JS:=java -jar $(CLOSURE_COMPILER) \
    --compilation_level=ADVANCED \
	--externs=externs.js \
    --output_wrapper="(function(){%output%})();" \
    --warning_level=VERBOSE

compiled_webrtc_adapter.js: webrtc_adapter.js externs.js $(CLOSURE_COMPILER)
	$(COMPILE_JS) --js_output_file=$@ $<
