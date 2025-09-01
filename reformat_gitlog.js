// Git log reformatter script
const fs = require('fs');

function reformatGitLog(inputFile, outputFile) {
  const content = fs.readFileSync(inputFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Group entries by date
  const dateGroups = {};
  
  lines.forEach(line => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    if (match) {
      const [, date, commit] = match;
      
      // Skip merge commits
      if (commit.includes('Merge branch')) {
        return;
      }
      
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(commit);
    }
  });
  
  // Process each date group
  const output = [];
  
  Object.keys(dateGroups).sort().forEach(date => {
    const commits = dateGroups[date];
    
    // Group commits by MKIS ticket
    const ticketGroups = {};
    const nonTicketCommits = [];
    
    commits.forEach(commit => {
      const ticketMatch = commit.match(/^(MKIS-\d+)(?:-[^:\s]*)?[\s:]*(.+)/);
      if (ticketMatch) {
        const [, ticketId, description] = ticketMatch;
        
        if (!ticketGroups[ticketId]) {
          ticketGroups[ticketId] = {
            mainTitle: '',
            subtasks: []
          };
        }
        
        // Extract main title and subtasks
        if (description.includes(' - ')) {
          const parts = description.split(' - ');
          const mainTitle = parts[0].trim().replace(/^:\s*/, '');
          const subtasks = parts.slice(1);
          
          if (!ticketGroups[ticketId].mainTitle || ticketGroups[ticketId].mainTitle.length < mainTitle.length) {
            ticketGroups[ticketId].mainTitle = mainTitle;
          }
          
          subtasks.forEach(subtask => {
            const cleanSubtask = subtask.trim().replace(/;$/, '');
            if (cleanSubtask && !ticketGroups[ticketId].subtasks.includes(cleanSubtask)) {
              ticketGroups[ticketId].subtasks.push(cleanSubtask);
            }
          });
        } else {
          // No subtasks, just main description
          const cleanDesc = description.trim().replace(/^:\s*/, '');
          if (!ticketGroups[ticketId].mainTitle || ticketGroups[ticketId].mainTitle.length < cleanDesc.length) {
            ticketGroups[ticketId].mainTitle = cleanDesc;
          }
        }
      } else {
        // Non-MKIS commits
        nonTicketCommits.push(commit);
      }
    });
    
    // Generate output for this date
    output.push(`## ${date}`);
    
    const ticketIds = Object.keys(ticketGroups).sort();
    
    if (ticketIds.length > 0) {
      // First ticket with [8] hours
      const firstTicket = ticketIds[0];
      const firstGroup = ticketGroups[firstTicket];
      output.push(`[8] ${firstTicket}: ${firstGroup.mainTitle}`);
      
      // Add non-ticket commits as subtasks to first ticket
      nonTicketCommits.forEach(commit => {
        output.push(`  - ${commit}`);
      });
      
      // Add subtasks for first ticket
      firstGroup.subtasks.forEach(subtask => {
        output.push(`  - ${subtask}`);
      });
      
      // Add remaining tickets
      ticketIds.slice(1).forEach(ticketId => {
        const group = ticketGroups[ticketId];
        output.push(`${ticketId} ${group.mainTitle}`);
        
        // Add subtasks
        group.subtasks.forEach(subtask => {
          output.push(`  - ${subtask}`);
        });
      });
    } else {
      // No MKIS tickets, just general work
      output.push(`[8] General work`);
      nonTicketCommits.forEach(commit => {
        output.push(`  - ${commit}`);
      });
    }
    
    output.push(''); // Empty line between dates
  });
  
  // Write output
  fs.writeFileSync(outputFile, output.join('\n'));
  console.log(`Reformatted git log saved to ${outputFile}`);
}

// Run the reformatter
if (require.main === module) {
  const inputFile = process.argv[2] || 'aug_ori.txt';
  const outputFile = process.argv[3] || 'aug_reformatted.txt';
  reformatGitLog(inputFile, outputFile);
}

module.exports = { reformatGitLog };
