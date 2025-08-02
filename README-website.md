# Solana Token Registry Explorer

A beautiful, modern web application for exploring the Solana Token Registry. Built with vanilla HTML, CSS, and JavaScript for maximum performance and compatibility.

## Features

- 🔍 **Smart Search**: Search tokens by name, symbol, or contract address
- 🏷️ **Category Filtering**: Filter tokens by categories (stablecoins, wrapped tokens, NFTs, etc.)
- 📱 **Responsive Design**: Perfect experience on desktop, tablet, and mobile
- 🎨 **Modern UI**: Beautiful dark theme with smooth animations
- 📄 **Token Details**: Click any token for detailed information
- 📋 **Copy Addresses**: One-click copying of token contract addresses
- ⚡ **Fast Performance**: Optimized for thousands of tokens

## Quick Start

### Local Development

1. Clone or download the repository
2. Navigate to the project directory
3. Start a local HTTP server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server .

# Using PHP
php -S localhost:8000
```

4. Open your browser and visit `http://localhost:8000`

### Deployment

This is a static website that can be deployed to any static hosting service:

#### GitHub Pages
1. Push the files to a GitHub repository
2. Go to Settings > Pages
3. Select source branch (usually `main`)
4. Your site will be available at `https://yourusername.github.io/repository-name`

#### Netlify
1. Drag and drop the project folder to [Netlify](https://netlify.com)
2. Your site will be deployed automatically

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

#### Other Services
Works with any static hosting service like:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- Surge.sh
- Firebase Hosting

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styles and theming
├── script.js           # JavaScript functionality
├── src/
│   └── tokens/
│       └── solana.tokenlist.json  # Token data
└── README-website.md   # This file
```

## Customization

### Theming
The website uses CSS custom properties (variables) for easy theming. Edit the `:root` section in `styles.css`:

```css
:root {
    --primary-color: #14f195;      /* Main accent color */
    --secondary-color: #9945ff;    /* Secondary accent */
    --background-color: #0f0f23;   /* Main background */
    --surface-color: #1a1a2e;      /* Card backgrounds */
    /* ... more variables */
}
```

### Adding Features
The codebase is modular and well-commented. Key areas for customization:

- **Search Logic**: Modify `filterTokens()` in `script.js`
- **Card Display**: Update `createTokenCard()` for different layouts
- **Styling**: Add custom CSS classes or modify existing ones

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 12+
- Mobile browsers (iOS Safari 12+, Chrome Mobile 60+)

## Performance

- Loads thousands of tokens efficiently
- Lazy loading for token images
- Debounced search (300ms delay)
- Optimized rendering with DocumentFragment
- CSS animations using transform/opacity for hardware acceleration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across different browsers
5. Submit a pull request

## License

This website is built using the official Solana SPL Token Registry data. See the main project's [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **Token data**: Report to the [official Solana token-list repository](https://github.com/solana-labs/token-list)
- **Website functionality**: Create an issue in this repository