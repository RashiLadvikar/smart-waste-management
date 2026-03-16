// geneticTaskAssigner.js
import mongoose from 'mongoose';
import Worker from './Models/Worker.js';
import { Task } from './taskModel.js';
import connectDB from './config/db.js';
import { notifyWorkerBoth } from './twilioService.js';


// Use the shared connection instead of connecting again
async function ensureConnection() {
  // If already connected, just return
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    return;
  }

  // If not connected, use the shared connection method
  await connectDB();
}

// Map severity and priority strings to numerical values for calculations
const severity_score = {
  'Low': 1,
  'Medium': 3,
  'High': 5
};

// Priority score mapping (adjust these values as needed)
const priority_score = {
  1: 1,   // Low priority
  2: 2,   // Medium priority
  3: 3,   // High priority
  4: 4,   // Very high priority
  5: 5    // Critical priority
};

// Function to determine current shift based on IST time (India Standard Time)
function getCurrentShift() {
  // Get current UTC time
  const now = new Date();

  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60; // IST is UTC+5:30 in minutes
  const istTime = new Date(now.getTime() + istOffset * 60 * 1000);
  const currentHour = istTime.getUTCHours(); // Use getUTCHours since we've already adjusted to IST

  console.log(`🕐 Server UTC time: ${now.toISOString()}`);
  console.log(`🕐 IST time: ${istTime.toISOString()} (Hour: ${currentHour})`);

  if (currentHour >= 6 && currentHour < 14) {
    return 'morning';
  } else if (currentHour >= 14 && currentHour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
}

// Function to generate initial population for the genetic algorithm
function generateInitialPopulation(workers, tasks, populationSize = 10) {
  const population = [];
  for (let i = 0; i < populationSize; i++) {
    // Each individual in the population represents an assignment of workers to tasks
    const individual = tasks.map(() => Math.floor(Math.random() * workers.length));
    population.push(individual);
  }
  return population;
}

// Function to calculate the fitness score for a given task-worker assignment
function calculateFitness(individual, workers, tasks) {
  let score = 0;

  for (let i = 0; i < tasks.length; i++) {
    const worker = workers[individual[i]];
    const task = tasks[i];

    // Check if the worker is from the correct department
    if (worker.department !== task.department) {
      score -= 50; // Penalize if departments don't match
    }

    // Prioritize tasks based on severity and size
    score += task.priority * 10;
    if (task.priority >= 8 && worker.emergencyResponder) score += 10;
    score -= worker.taskLoad * 2;  // Penalize workers with high task load

    // Check shift matching (worker's shift and task time)
    const taskHour = new Date(task.createdAt).getHours();
    const shiftTimings = {
      morning: [6, 14],   // 6 AM to 2 PM
      evening: [14, 22],  // 2 PM to 10 PM
      night: [22, 6]      // 10 PM to 6 AM (next day)
    };
    const [start, end] = shiftTimings[worker.shift] || [];
    if (
      (start < end && taskHour >= start && taskHour < end) ||  // e.g., morning/evening
      (start > end && (taskHour >= start || taskHour < end))   // e.g., night shift
    ) {
      score += 10; // Strong match for shift timing
    } else {
      score -= 5;  // Penalize mismatch for shift
    }

    // Check for preferred location match - fixed to use worker.location properly
    if (worker.location && task.location) {
      if (worker.location === task.location) {
        score += 25; // Exact match bonus
      } else if (task.location.includes(worker.location) || worker.location.includes(task.location)) {
        score += 15; // Partial match bonus
      } else {
        score -= 25; // Mismatch penalty
      }
    }

    // *Age consideration*: Penalize or reward based on age suitability
    if (task.severity === 'High' && worker.age > 50) {
      score -= 20;  // Penalize assigning physically demanding tasks to older workers
    } else if (task.severity === 'Low' && worker.age < 25) {
      score += 10;  // Reward younger workers for less physically demanding tasks
    }

    // *Gender consideration*: Add a reward for gender-based preferences if relevant
    if (task.genderPreference && worker.gender !== task.genderPreference) {
      score -= 15;  // Penalize if the worker's gender does not match the task's gender preference
    }

    // Determine the number of workers required based on task size and priority
    const requiredWorkers = calculateRequiredWorkers(task);
    if (individual.filter(id => id === worker.id).length > requiredWorkers) {
      score -= 50; // Penalize if too many workers are assigned
    }
  }

  return score;
}

// Function to calculate how many workers are needed based on task characteristics (size, severity, priority)
function calculateRequiredWorkers(task) {
  const s = severity_score[task.severity];
  const p = priority_score[task.priority];
  const z = task.size;

  // Formula to calculate how many workers are needed based on task attributes
  const score = s + p + z;

  if (score <= 4) return 1;     // Low tasks need 1 worker
  else if (score <= 6) return 2; // Medium tasks need 2 workers
  else if (score <= 8) return 3; // Large tasks need 3 workers
  else return 4;                 // High tasks need 4 workers
}

// Function to perform crossover between two parent solutions
function crossover(parent1, parent2) {
  const crossoverPoint = Math.floor(Math.random() * parent1.length);
  return [
    parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint)),
    parent2.slice(0, crossoverPoint).concat(parent1.slice(crossoverPoint))
  ];
}

// Function to mutate an individual by changing a random worker assignment
function mutate(individual, workersLength, mutationRate = 0.1) {
  return individual.map(gene => (Math.random() < mutationRate ? Math.floor(Math.random() * workersLength) : gene));
}

// Function to select the best individuals based on fitness scores
function selectBest(population, workers, tasks, count = 4) {
  return population
    .map(ind => ({ ind, fitness: calculateFitness(ind, workers, tasks) }))
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, count)
    .map(x => x.ind);
}

// Tournament selection for picking the best individuals
function tournamentSelection(population, workers, tasks, k = 3) {
  const tournament = [];
  for (let i = 0; i < k; i++) {
    const ind = population[Math.floor(Math.random() * population.length)];
    const fitness = calculateFitness(ind, workers, tasks);
    tournament.push({ ind, fitness });
  }
  tournament.sort((a, b) => b.fitness - a.fitness);
  return tournament[0].ind;
}

// Main function to assign tasks using genetic algorithm
async function assignTasks() {
  await ensureConnection();

  // Start a session for transaction support
  const session = await mongoose.startSession();

  // Store notification tasks to be executed after transaction completion
  const notificationQueue = [];

  try {
    // Start a transaction
    session.startTransaction();

    // Get the current shift based on time
    const currentShift = getCurrentShift();
    console.log(`🕒 Current shift is: ${currentShift}`);

    // Only get tasks that are definitely not assigned yet
    const tasks = await Task.find({
      assigned: false,
      processing: { $ne: true } // Ensure no other instance is processing these
    }).session(session);

    if (!tasks.length) {
      console.log('⚠ No unassigned tasks available');
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Pre-filter workers based on availability and current shift
    const allWorkers = await Worker.find({
      available: true,
      shift: currentShift
    }).session(session);

    if (!allWorkers.length) {
      console.log(`⚠ No available workers for ${currentShift} shift`);
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // First, mark all these tasks as being processed to prevent other instances from assigning them
    const taskIds = tasks.map(task => task._id);
    await Task.updateMany(
      { _id: { $in: taskIds }, assigned: false },
      { $set: { processing: true } },
      { session }
    );

    // Group tasks by department
    const tasksByDepartment = {};
    tasks.forEach(task => {
      if (!tasksByDepartment[task.department]) {
        tasksByDepartment[task.department] = [];
      }
      tasksByDepartment[task.department].push(task);
    });

    // Process each department's tasks separately
    for (const [department, departmentTasks] of Object.entries(tasksByDepartment)) {
      console.log(`🧹 Processing ${departmentTasks.length} tasks for ${department} department`);

      // Get workers for this department
      const departmentWorkers = allWorkers.filter(worker => worker.department === department);

      if (!departmentWorkers.length) {
        console.log(`⚠ No available workers for ${department} department in ${currentShift} shift`);
        continue; // Skip to next department
      }

      let population = generateInitialPopulation(departmentWorkers, departmentTasks);

      // Iterate through multiple generations
      for (let gen = 0; gen < 50; gen++) {
        const elite = selectBest(population, departmentWorkers, departmentTasks);
        const nextGen = [...elite];

        while (nextGen.length < population.length) {
          const p1 = tournamentSelection(population, departmentWorkers, departmentTasks);
          const p2 = tournamentSelection(population, departmentWorkers, departmentTasks);
          const [child1, child2] = crossover(p1, p2);
          nextGen.push(mutate(child1, departmentWorkers.length));
          if (nextGen.length < population.length) {
            nextGen.push(mutate(child2, departmentWorkers.length));
          }
        }

        population = nextGen;
      }

      // Get the best solution after the last generation
      const best = selectBest(population, departmentWorkers, departmentTasks, 1)[0];

      // Assign tasks to the workers based on the best solution
      for (let i = 0; i < departmentTasks.length; i++) {
        const worker = departmentWorkers[best[i]];
        const task = departmentTasks[i];

        // Double-check this task hasn't been assigned yet (safety check)
        const freshTaskCheck = await Task.findOne({ _id: task._id, assigned: false }).session(session);
        if (!freshTaskCheck) {
          console.log(`⚠️ Task ${task._id} already assigned by another process, skipping.`);
          continue;
        }

        // Double-check worker is still available
        const freshWorkerCheck = await Worker.findOne({ _id: worker._id, available: true }).session(session);
        if (!freshWorkerCheck) {
          console.log(`⚠️ Worker ${worker.firstName} (${worker._id}) no longer available, skipping.`);
          continue;
        }

        // Update the task and worker in the database
        task.assigned = true;
        task.assignedWorker = worker._id;
        task.processing = false;
        await task.save({ session });

        // Update worker to be unavailable and increase task load
        worker.available = false; // Mark worker as unavailable
        worker.taskLoad = (worker.taskLoad || 0) + 1;
        if (!worker.taskHistory) worker.taskHistory = [];
        worker.taskHistory.push(task._id);
        await worker.save({ session });

        console.log(`🧹 Assigned Task ${task._id} (${task.department} - ${task.severity}) to ${worker.firstName} (${worker.email}) (${worker.phone}) (${worker._id})`);

        notificationQueue.push({
          workerPhone: worker.phone,
          worker: {
            firstName: worker.firstName,
            _id: worker._id.toString()
          },
          task: {
            _id: task._id.toString(),
            department: task.department,
            severity: task.severity,
            priority: task.priority,
            location: task.location || 'Not specified'
          }
        });
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    console.log('✅ Task assignment completed successfully');

    // Now that the transaction is committed, process the notification queue
    for (const notification of notificationQueue) {
      try {
        console.log(`🔔 Sending notifications to ${notification.worker.firstName} at ${notification.workerPhone}`);
        const notificationResults = await notifyWorkerBoth(
          notification.workerPhone,
          notification.task,
          notification.worker
        );

        // Log notification results
        if (notificationResults.sms) {
          console.log(`📱 SMS notification sent successfully (SID: ${notificationResults.sms.sid})`);
        }
        if (notificationResults.call) {
          console.log(`📞 Call notification sent successfully (SID: ${notificationResults.call.sid})`);
        }
        if (notificationResults.errors.length > 0) {
          console.warn(`⚠️ Some notifications failed for ${notification.worker.firstName}:`,
            notificationResults.errors.map(e => e.type).join(', '));
        }
      } catch (error) {
        console.error(`❌ Failed to notify worker ${notification.worker.firstName}:`, error);
        // Continue with other notifications
      }
    }

  } catch (error) {
    // If an error occurs, abort the transaction
    await session.abortTransaction();
    console.error('❌ Error during task assignment:', error);
  } finally {
    // End the session
    session.endSession();
  }
}

export { assignTasks };