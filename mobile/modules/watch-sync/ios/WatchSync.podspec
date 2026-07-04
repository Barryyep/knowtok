Pod::Spec.new do |s|
  s.name           = 'WatchSync'
  s.version        = '1.0.0'
  s.summary        = 'WatchConnectivity bridge for Ohlo'
  s.description    = 'Pushes the daily fact to the paired Apple Watch.'
  s.author         = 'Ohlo'
  s.homepage       = 'https://github.com/ohlo'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.license        = { :type => 'MIT' }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
