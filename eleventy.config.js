// Configuration d'Eleventy (le générateur qui fabrique les pages HTML).
// Les pages sont générées dans le dossier _site/ ; c'est ce dossier qui est mis en ligne.

export default function (eleventyConfig) {
  // Tout ce qui est dans src/assets/ (CSS, JS, images, paroles) est copié tel quel dans _site/assets/
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Recharge aussi la prévisualisation quand on modifie les données ou le CSS/JS
  eleventyConfig.addWatchTarget('src/_data/');
  eleventyConfig.addWatchTarget('src/assets/css/');
  eleventyConfig.addWatchTarget('src/assets/js/');

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site',
    },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
