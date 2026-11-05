# QA-BENCH (our code, MIT): runs upstream's config.ru unchanged, wrapped in QaBenchChanges, which applies the
# deliberate changes listed in QA_BENCH_CHANGES (comma list) to responses at run time. Upstream files are not edited.
require_relative 'qa_bench_changes'

upstream = Rack::Builder.parse_file(File.expand_path('../config.ru', __dir__))
use QaBenchChanges
run upstream
