# First update i18n/po/template.pot from sources
grunt nggettext_extract

# Then update swedish translation based on template (adding/removing terms)
# -U update in place
# -N do not use fuzzy matching
msgmerge i18n/po/sv.po i18n/po/template.pot -U -N

# Then we would need to go to POeditor.com and update swedish from github!
