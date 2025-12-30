
const { initDatabase, getDatabase, closeDatabase } = require('./db');
const ConfigService = require('./config-service');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixConfig() {
    console.log('Starting fixConfig...');
    try {
        console.log('Initializing DB...');
        await initDatabase();
        const db = getDatabase();
        
        console.log('Reading current config...');
        const currentConfig = await ConfigService.getLLMConfig(db);
        console.log('Current:', JSON.stringify(currentConfig));
        
        const newConfig = {
            ...currentConfig,
            provider: 'gemini'
        };
        
        console.log('Setting new config...', newConfig);
        await ConfigService.setLLMConfig(db, newConfig);
        
        console.log('LLM Config updated successfully.');
        
        await closeDatabase();
        process.exit(0);
    } catch (err) {
        console.error('Error updating config:', err);
        process.exit(1);
    }
}

fixConfig();
