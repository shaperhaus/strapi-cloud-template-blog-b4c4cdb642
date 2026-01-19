# Strapi Cloud Deployment Guide

## ✅ Content Types Created

I've created all 6 content type schemas in the proper Strapi directory structure:

1. **FAQ** - `/src/api/faq/content-types/faq/schema.json`
2. **Feature** - `/src/api/feature/content-types/feature/schema.json`
3. **Possibility** - `/src/api/possibility/content-types/possibility/schema.json`
4. **Work Step** - `/src/api/work-step/content-types/work-step/schema.json`
5. **Product** - `/src/api/product/content-types/product/schema.json`
6. **Smart Home Plan** - `/src/api/smart-home-plan/content-types/smart-home-plan/schema.json`

## 📤 Next Steps: Push to GitHub

Since your Strapi Cloud is linked to a GitHub repository, you need to push these changes to trigger automatic deployment.

### Option 1: Initialize Git and Push (if not already a repo)

```bash
cd /Users/ashusharma/Ash/sharphaus/strapi_cloud

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Add smart home content types"

# Add your GitHub remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### Option 2: If You Already Have the Repo URL

1. **Find your Strapi Cloud GitHub repo URL**:
   - Go to your Strapi Cloud dashboard
   - Look for the linked GitHub repository
   - Copy the clone URL

2. **Clone the repo to a different location** (if needed):
   ```bash
   cd /Users/ashusharma/Ash/sharphaus
   git clone YOUR_GITHUB_REPO_URL strapi_cloud_git
   ```

3. **Copy the content type files**:
   ```bash
   cp -r strapi_cloud/src/api/* strapi_cloud_git/src/api/
   ```

4. **Commit and push**:
   ```bash
   cd strapi_cloud_git
   git add src/api/faq src/api/feature src/api/possibility src/api/work-step src/api/product src/api/smart-home-plan
   git commit -m "Add smart home content types: FAQ, Feature, Possibility, Product, Work Step, Smart Home Plan"
   git push
   ```

## 🚀 After Pushing

1. **Strapi Cloud will automatically deploy** your changes (usually takes 2-5 minutes)
2. **Check deployment status** in your Strapi Cloud dashboard
3. **Once deployed**, the content types will appear in your Strapi admin panel
4. **Set permissions**: Go to Settings → Users & Permissions → Roles → Public
   - Enable `find` and `findOne` for: FAQ, Feature, Possibility, Work Step, Product
   - Enable `create` for: Smart Home Plan

## 🌱 Add Sample Data

Once deployed, you can either:

**Option A: Manual entry** (through Strapi admin panel)
- Go to Content Manager
- Add entries for each content type

**Option B: Use the seed script** (if API key works)
```bash
cd /Users/ashusharma/Ash/sharphaus/strapi
npm run seed
```

## ✅ Verify

After deployment and adding data, test:
```bash
curl https://attractive-novelty-8292f7503f.strapiapp.com/api/faqs
```

You should see your FAQ data!

## 📋 Content Type Summary

| Content Type | Schema Location | Purpose |
|--------------|----------------|---------|
| FAQ | `src/api/faq/` | Frequently asked questions |
| Feature | `src/api/feature/` | "What You Get" features |
| Possibility | `src/api/possibility/` | "Sneak Peek" solutions |
| Work Step | `src/api/work-step/` | "How It Works" steps |
| Product | `src/api/product/` | Smart home products |
| Smart Home Plan | `src/api/smart-home-plan/` | User plans |
