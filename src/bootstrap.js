'use strict';

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const { categories, authors, articles, global, about } = require('../data/data.json');

async function seedExampleApp() {
  const shouldImportSeedData = await isFirstRun();

  if (shouldImportSeedData) {
    try {
      console.log('Setting up the template...');
      await importSeedData();
      console.log('Ready to go');
    } catch (error) {
      console.log('Could not import seed data');
      console.error(error);
    }
  } else {
    console.log(
      'Seed data has already been imported. We cannot reimport unless you clear your database first.'
    );
  }
}

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const initHasRun = await pluginStore.get({ key: 'initHasRun' });
  await pluginStore.set({ key: 'initHasRun', value: true });
  return !initHasRun;
}

async function setPublicPermissions(newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: {
      type: 'public',
    },
  });

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) => {
      return strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      });
    });
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function getFileData(fileName) {
  const filePath = path.join('data', 'uploads', fileName);
  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split('.').pop();
  const mimeType = mime.lookup(ext || '') || '';

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `An image uploaded to Strapi called ${name}`,
          caption: name,
          name,
        },
      },
    });
}

// Create an entry and attach files if there are any
async function createEntry({ model, entry }) {
  try {
    // Actually create the entry in Strapi
    await strapi.documents(`api::${model}.${model}`).create({
      data: entry,
    });
  } catch (error) {
    console.error({ model, entry, error });
  }
}

async function checkFileExistsBeforeUpload(files) {
  const existingFiles = [];
  const uploadedFiles = [];
  const filesCopy = [...files];

  for (const fileName of filesCopy) {
    // Check if the file already exists in Strapi
    const fileWhereName = await strapi.query('plugin::upload.file').findOne({
      where: {
        name: fileName.replace(/\..*$/, ''),
      },
    });

    if (fileWhereName) {
      // File exists, don't upload it
      existingFiles.push(fileWhereName);
    } else {
      // File doesn't exist, upload it
      const fileData = getFileData(fileName);
      const fileNameNoExtension = fileName.split('.').shift();
      const [file] = await uploadFile(fileData, fileNameNoExtension);
      uploadedFiles.push(file);
    }
  }
  const allFiles = [...existingFiles, ...uploadedFiles];
  // If only one file then return only that file
  return allFiles.length === 1 ? allFiles[0] : allFiles;
}

async function updateBlocks(blocks) {
  const updatedBlocks = [];
  for (const block of blocks) {
    if (block.__component === 'shared.media') {
      const uploadedFiles = await checkFileExistsBeforeUpload([block.file]);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file name on the block with the actual file
      blockCopy.file = uploadedFiles;
      updatedBlocks.push(blockCopy);
    } else if (block.__component === 'shared.slider') {
      // Get files already uploaded to Strapi or upload new files
      const existingAndUploadedFiles = await checkFileExistsBeforeUpload(block.files);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file names on the block with the actual files
      blockCopy.files = existingAndUploadedFiles;
      // Push the updated block
      updatedBlocks.push(blockCopy);
    } else {
      // Just push the block as is
      updatedBlocks.push(block);
    }
  }

  return updatedBlocks;
}

async function importArticles() {
  for (const article of articles) {
    const cover = await checkFileExistsBeforeUpload([`${article.slug}.jpg`]);
    const updatedBlocks = await updateBlocks(article.blocks);

    await createEntry({
      model: 'article',
      entry: {
        ...article,
        cover,
        blocks: updatedBlocks,
        // Make sure it's not a draft
        publishedAt: Date.now(),
      },
    });
  }
}

async function importGlobal() {
  const favicon = await checkFileExistsBeforeUpload(['favicon.png']);
  const shareImage = await checkFileExistsBeforeUpload(['default-image.png']);
  return createEntry({
    model: 'global',
    entry: {
      ...global,
      favicon,
      // Make sure it's not a draft
      publishedAt: Date.now(),
      defaultSeo: {
        ...global.defaultSeo,
        shareImage,
      },
    },
  });
}

async function importAbout() {
  const updatedBlocks = await updateBlocks(about.blocks);

  await createEntry({
    model: 'about',
    entry: {
      ...about,
      blocks: updatedBlocks,
      // Make sure it's not a draft
      publishedAt: Date.now(),
    },
  });
}

async function importCategories() {
  for (const category of categories) {
    await createEntry({ model: 'category', entry: category });
  }
}

async function importAuthors() {
  for (const author of authors) {
    const avatar = await checkFileExistsBeforeUpload([author.avatar]);

    await createEntry({
      model: 'author',
      entry: {
        ...author,
        avatar,
      },
    });
  }
}

async function importSmartHomeContent() {
  // Import FAQs
  const faqs = [
    {
      question: 'Do I need to already own smart devices?',
      answer: "No! Our plans are designed for everyone, whether you're starting from scratch or already have some smart devices. We'll recommend products that work together seamlessly and fit your specific needs and budget.",
      order: 1,
      category: 'general',
      publishedAt: Date.now(),
    },
    {
      question: 'Can I customize the plan after I get it?',
      answer: "Absolutely! Your plan is a starting point tailored to your survey responses. You can adjust it based on your preferences, budget, or as your needs change. We provide flexible recommendations that you can mix and match.",
      order: 2,
      category: 'general',
      publishedAt: Date.now(),
    },
    {
      question: 'Will this work with Alexa or Google Home?',
      answer: "Yes! We recommend products that are compatible with major smart home ecosystems including Amazon Alexa, Google Home, and Apple HomeKit. Your plan will specify which devices work with which platforms.",
      order: 3,
      category: 'technical',
      publishedAt: Date.now(),
    },
    {
      question: 'What if I live in an apartment?',
      answer: "Perfect! Many of our solutions are renter-friendly and don't require permanent installation. We focus on plug-and-play devices, smart bulbs, and portable sensors that you can take with you when you move.",
      order: 4,
      category: 'general',
      publishedAt: Date.now(),
    },
  ];

  for (const faq of faqs) {
    await createEntry({ model: 'faq', entry: faq });
  }

  // Import Features
  const features = [
    {
      title: 'Personalized to You',
      description: 'Plans tailored to your rooms, routines, and style — no cookie-cutter setups.',
      order: 1,
      publishedAt: Date.now(),
    },
    {
      title: 'Smart, Thoughtful Solutions',
      description: "Ideas you haven't thought of, solving real-life needs and elevating your space.",
      order: 2,
      publishedAt: Date.now(),
    },
    {
      title: 'The Perfect Products',
      description: 'Curated picks that work beautifully together, with ready-to-buy links so you can move forward without the guesswork.',
      order: 3,
      publishedAt: Date.now(),
    },
    {
      title: 'Guidance Made Easy',
      description: 'Clear steps that turn your plan into reality — without the stress or guesswork.',
      order: 4,
      publishedAt: Date.now(),
    },
  ];

  for (const feature of features) {
    await createEntry({ model: 'feature', entry: feature });
  }

  // Import Possibilities
  const possibilities = [
    {
      title: 'Light Your Path at Night',
      description: 'Motion-activated lighting for safe, effortless trips in the dark.',
      category: 'lighting',
      order: 1,
      publishedAt: Date.now(),
    },
    {
      title: 'Keep the Peace at Bedtime',
      description: 'Warm, focused lighting that lets you read without disturbing your partner.',
      category: 'lighting',
      order: 2,
      publishedAt: Date.now(),
    },
    {
      title: 'Keep Control Within Reach',
      description: 'Optimally placed buttons for instant lighting and mood control.',
      category: 'convenience',
      order: 3,
      publishedAt: Date.now(),
    },
    {
      title: 'Save Energy Effortlessly',
      description: "Lights that switch off automatically when they're not needed.",
      category: 'energy',
      order: 4,
      publishedAt: Date.now(),
    },
    {
      title: "Keep Home Safe While You're Away",
      description: 'Smart security features that give you peace of mind when you\'re not home.',
      category: 'security',
      order: 5,
      publishedAt: Date.now(),
    },
  ];

  for (const possibility of possibilities) {
    await createEntry({ model: 'possibility', entry: possibility });
  }

  // Import Work Steps
  const workSteps = [
    {
      title: 'Tell Us About Your Space',
      description: 'Quick lifestyle survey.',
      stepNumber: 1,
      publishedAt: Date.now(),
    },
    {
      title: 'Get Your Perfect Plan',
      description: 'See solutions made for you.',
      stepNumber: 2,
      publishedAt: Date.now(),
    },
    {
      title: 'Make It Real',
      description: 'Buy the right products and follow easy steps.',
      stepNumber: 3,
      publishedAt: Date.now(),
    },
  ];

  for (const step of workSteps) {
    await createEntry({ model: 'work-step', entry: step });
  }

  // Import Products
  const products = [
    {
      name: 'Philips Hue White and Color Ambiance Starter Kit',
      description: 'Complete smart lighting starter kit with hub and color-changing bulbs. Perfect for creating custom lighting scenes and automations.',
      price: 199.99,
      category: 'lighting',
      brand: 'Philips',
      rating: 4.7,
      affiliateLink: 'https://amazon.com/philips-hue-starter-kit',
      publishedAt: Date.now(),
    },
    {
      name: 'Aqara Motion Sensor',
      description: 'Compact motion sensor with 170° detection angle. Battery-powered and easy to install anywhere.',
      price: 19.99,
      category: 'sensors',
      brand: 'Aqara',
      rating: 4.5,
      affiliateLink: 'https://amazon.com/aqara-motion-sensor',
      publishedAt: Date.now(),
    },
    {
      name: 'Samsung SmartThings Hub',
      description: 'Central hub that connects and controls all your smart home devices in one place.',
      price: 89.99,
      category: 'hubs',
      brand: 'Samsung',
      rating: 4.4,
      affiliateLink: 'https://amazon.com/smartthings-hub',
      publishedAt: Date.now(),
    },
    {
      name: 'LIFX Smart Bulb',
      description: 'No hub required! WiFi-enabled color-changing smart bulb with 16 million colors.',
      price: 44.99,
      category: 'lighting',
      brand: 'LIFX',
      rating: 4.6,
      affiliateLink: 'https://amazon.com/lifx-smart-bulb',
      publishedAt: Date.now(),
    },
  ];

  for (const product of products) {
    await createEntry({ model: 'product', entry: product });
  }
}

async function importSeedData() {
  // Allow read of application content types
  await setPublicPermissions({
    article: ['find', 'findOne'],
    category: ['find', 'findOne'],
    author: ['find', 'findOne'],
    global: ['find', 'findOne'],
    about: ['find', 'findOne'],
    // Smart home content types
    faq: ['find', 'findOne'],
    feature: ['find', 'findOne'],
    possibility: ['find', 'findOne'],
    'work-step': ['find', 'findOne'],
    product: ['find', 'findOne'],
    'smart-home-plan': ['create'],
  });

  // Create all entries
  await importCategories();
  await importAuthors();
  await importArticles();
  await importGlobal();
  await importAbout();

  // Import smart home content
  await importSmartHomeContent();
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  await seedExampleApp();
  await app.destroy();

  process.exit(0);
}


module.exports = async () => {
  await seedExampleApp();
};
