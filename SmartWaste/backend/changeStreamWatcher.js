// changeStreamWatcher.js
import mongoose from 'mongoose';
import { Task } from './taskModel.js';
import { assignTasks } from './geneticTaskAssigner.js';

const DB_URI = 'mongodb+srv://root:root@cluster0.ik1za.mongodb.net/SmartWaste';

async function watchChanges() {
  try {
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
    });
    console.log('✅ Connected to MongoDB for change stream');

    const taskChangeStream = Task.watch();

    taskChangeStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        console.log('🆕 New task inserted, reassigning tasks...');
        await assignTasks();
      }
    });

  } catch (err) {
    console.error('❌ Error with change stream:', err);
  }
}

watchChanges();
