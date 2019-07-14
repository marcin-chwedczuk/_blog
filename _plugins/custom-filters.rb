module Jekyll
  module TagSorter
    def sort_tags(collection)
      collection.sort_by { |t| 
        [-t[1].size.to_i, t[0].downcase.to_s]
      }
    end
  end

  module TagBlacklister
    def blacklist_tags(tags)
        blacklist = ['jvmbloggers']
        tags.reject { |t|
            blacklist.any? { |b| 
                t[0].downcase.include?(b)
            }
        }
    end
  end

  module TagExtractor 
    def get_tag(url)
        url.gsub(/(\\|\/)+/, "/").gsub(/\/$/, '').split('/').last
    end
  end
end

Liquid::Template.register_filter(Jekyll::TagSorter)
Liquid::Template.register_filter(Jekyll::TagBlacklister)
Liquid::Template.register_filter(Jekyll::TagExtractor)
