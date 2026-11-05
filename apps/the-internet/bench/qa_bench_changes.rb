# QA-BENCH (our code, MIT): deliberate changes (not bugs) for the-internet, switched by QA_BENCH_CHANGES.
# Each change rewrites exact upstream markup on one path; an unknown change name stops the server at start.
class QaBenchChanges
  REWRITES = {
    'welcome-heading' => [
      ['/', '<h1 class="heading">Welcome to the-internet</h1>',
       '<h1 class="heading">Welcome to The Internet practice site</h1>'],
    ],
  }.freeze

  def initialize(app)
    @app = app
    @active = ENV.fetch('QA_BENCH_CHANGES', '').split(',').map(&:strip).reject(&:empty?)
    unknown = @active - REWRITES.keys
    raise ArgumentError, "unknown QA_BENCH_CHANGES value(s): #{unknown.join(', ')}" unless unknown.empty?
  end

  def call(env)
    status, headers, body = @app.call(env)
    rules = @active.flat_map { |name| REWRITES[name] }.select { |path, _, _| env['PATH_INFO'] == path }
    type = headers['content-type'] || headers['Content-Type']
    return [status, headers, body] if rules.empty? || !type.to_s.start_with?('text/html')

    text = +''
    body.each { |chunk| text << chunk }
    body.close if body.respond_to?(:close)
    rules.each do |_, from, to|
      raise "QA_BENCH_CHANGES: upstream markup changed, cannot find #{from.inspect}" unless text.include?(from)

      text = text.sub(from, to)
    end
    headers = headers.reject { |k, _| k.casecmp?('content-length') }
    headers['content-length'] = text.bytesize.to_s
    [status, headers, [text]]
  end
end
