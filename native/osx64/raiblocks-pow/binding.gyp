{
	"targets": [
		{
			"target_name": "functions",
			"win_delay_load_hook": "true",
			"sources": [
				 "functions.cpp"
				,"xorshift.hpp"
				,"blake2/blake2b.c"
				,"blake2/blake2bp.c"
				,"blake2/blake2s.c"
				,"blake2/blake2sp.c"
			],
			"include_dirs": [
				 "<!(node -e \"require('nan')\")"
				,"blake2"
			],
			"cflags_c": [
				 "-std=c99"
				,"-Wstrict-aliasing"
				,"-Wextra"
				,"-Wno-unused-function"
				,"-Wno-unused-const-variable"
			],
			"cflags_cc": [
				 "-Wstrict-aliasing"
				,"-Wextra"
				,"-Wno-unused-function"
				,"-Wno-unused-const-variable"
				,"-Wno-unused-parameter"
			],
			'xcode_settings': {
				'OTHER_CFLAGS': [
					 "-Wstrict-aliasing"
					,"-Wextra"
					,"-Wno-unused-function"
					,"-Wno-unused-const-variable"
					,"-Wno-unused-parameter"
				]
			},
			"msvs_settings": {
				"VCCLCompilerTool": {
					"AdditionalOptions": ["/arch:AVX"]
				}
			}
		}
	]
}
