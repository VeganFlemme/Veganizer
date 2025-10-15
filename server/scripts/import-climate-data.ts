import fs from 'fs';
import csv from 'csv-parser';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface ClimateDataRow {
  'Input/Output': string;
  'Name of consumption mix': string;
  'Name of input/output': string;
  'Quantity': string;
  'Unit': string;
  'Comment on proxys / origins': string;
}

async function importClimateData() {
  console.log('Starting APICLIMAT.csv import...');
  
  try {
    const results: ClimateDataRow[] = [];
    let processedRows = 0;
    let importedRows = 0;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('APICLIMAT.csv')
        .pipe(csv({
          separator: ';',
          skipLinesWithError: true
        }))
        .on('data', (row: ClimateDataRow) => {
          processedRows++;
          
          // Skip header rows, empty rows, and metadata
          if (row['Input/Output'] && 
              (row['Input/Output'] === 'Input' || row['Input/Output'] === 'Output') &&
              row['Name of consumption mix'] &&
              row['Name of input/output']) {
            results.push(row);
          }
        })
        .on('end', async () => {
          console.log(`Processed ${processedRows} rows from CSV`);
          console.log(`Found ${results.length} valid climate consumption mix records`);
          
          // Insert data in batches to avoid overwhelming the database
          const batchSize = 100;
          for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            
            try {
              const insertData = batch.map(row => ({
                input_output_type: row['Input/Output'],
                consumption_mix_name: row['Name of consumption mix'] || '',
                component_name: row['Name of input/output'] || '',
                quantity: row['Quantity'] ? parseFloat(row['Quantity'].replace(',', '.')) : null,
                unit: row['Unit'] || '',
                comment: row['Comment on proxys / origins'] || '',
                data_source: 'APICLIMAT'
              }));
              
              // Insert using raw SQL
              for (const record of insertData) {
                await sql`
                  INSERT INTO climate_consumption_mix 
                  (input_output_type, consumption_mix_name, component_name, quantity, unit, comment, data_source)
                  VALUES (${record.input_output_type}, ${record.consumption_mix_name}, ${record.component_name}, 
                          ${record.quantity}, ${record.unit}, ${record.comment}, ${record.data_source})
                `;
              }
              importedRows += batch.length;
              console.log(`Imported batch ${Math.floor(i / batchSize) + 1}, total: ${importedRows} records`);
            } catch (error) {
              console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error);
            }
          }
          
          console.log(`Climate data import completed: ${importedRows} records imported`);
          resolve(importedRows);
        })
        .on('error', (error) => {
          console.error('Error reading CSV file:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('Climate data import failed:', error);
    throw error;
  }
}

// Run the import
if (require.main === module) {
  importClimateData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default importClimateData;