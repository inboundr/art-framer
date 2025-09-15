# Art Framer 🎨

> AI-powered art generation meets e-commerce - Create, customize, and order framed AI artwork delivered to your doorstep.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Ideogram API key
- Gelato API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd art-framer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables in `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   
   # AI Image Generation
   IDEOGRAM_API_KEY=your_ideogram_api_key
   VEO_API_KEY=your_veo_api_key
   
   # Dropshipping
   GELATO_API_KEY=your_gelato_api_key
   PRODIGI_API_KEY=your_prodigi_api_key
   
   # Email
   RESEND_API_KEY=your_resend_api_key
   
   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible components
- **Zustand** - State management

### Backend
- **Supabase** - Database, Auth, and Storage
  - PostgreSQL database with real-time subscriptions
  - Built-in authentication and user management
  - File storage with CDN delivery and image optimization
- **Next.js API Routes** - Serverless functions
- **Stripe** - Payment processing
- **Ideogram API** - AI image generation
- **Gelato API** - Print-on-demand

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # User dashboard
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── globals.css        # Global styles
├── lib/                   # Utility libraries
│   ├── supabase/          # Database client
│   ├── stripe/            # Payment processing
│   ├── ai-image/          # AI generation
│   └── utils/             # Helper functions
└── components/            # UI components
    ├── ui/                # Base UI components
    ├── forms/             # Form components
    └── layout/            # Layout components
```

## 🎯 Key Features

### ✨ AI Art Generation
- **No-login required** - Start creating immediately
- **Multiple AI models** - Ideogram (primary), Veo (backup)
- **Real-time generation** - See your art come to life
- **Style customization** - Choose from various artistic styles

### 🖼️ Frame Customization
- **Three sizes** - Small (8x10"), Medium (12x16"), Large (16x20")
- **Frame styles** - Black, White, Natural wood
- **Real-time preview** - See how your art looks framed
- **Dynamic pricing** - Transparent pricing based on size

### 🛒 Seamless E-commerce
- **One-click ordering** - From generation to purchase
- **Secure payments** - Stripe-powered checkout
- **Order tracking** - Real-time updates on your order
- **Email notifications** - Keep informed every step

### 🚚 Dropshipping Integration
- **Zero inventory** - 100% dropshipping model
- **Global fulfillment** - Gelato's worldwide network
- **Fast delivery** - Local production partners
- **Quality assurance** - Professional printing and framing

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🔧 Development

### Code Style
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type safety

### Git Workflow
1. Create a feature branch
2. Make your changes
3. Run `npm run lint` and `npm run type-check`
4. Commit your changes
5. Create a pull request

## 📊 Environment Variables

Make sure to set up all required environment variables in your `.env.local` file. See the installation section for the complete list.

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   - Push your code to GitHub
   - Connect to Vercel
   - Configure environment variables

2. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: Check the docs folder
- **Issues**: Create a GitHub issue
- **Email**: support@artframer.com

---

**Built with ❤️ by the Art Framer team**
