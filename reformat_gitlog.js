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
      
      // Skip merge commits (all variations)
      if (commit.match(/^Merge (branch|remote-tracking branch)/i)) {
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
      // Match MKIS ticket at the start
      const ticketMatch = commit.match(/^(MKIS-\d+)/);
      if (ticketMatch) {
        const ticketId = ticketMatch[1];
        const restOfCommit = commit.substring(ticketId.length).trim();
        
        if (!ticketGroups[ticketId]) {
          ticketGroups[ticketId] = {
            mainTitle: '',
            subtasks: [],
            titleParts: new Set() // Track parts that are in the title
          };
        }
        
        // Parse the description after ticket ID
        // Format: "MKIS-1234 Main Title - subtask1 - subtask2"
        let description = restOfCommit.replace(/^[-:\s]+/, ''); // Remove leading :, -, or spaces
        
        if (description.includes(' - ')) {
          const parts = description.split(' - ').map(p => p.trim().replace(/;$/, ''));
          
          let mainTitle = parts[0];
          let subtaskStartIndex = 1;
          
          // Check if second part is a feature/component name (should be part of title)
          // Feature names are capitalized and don't start with action verbs
          let hasFeatureName = false;
          if (parts.length > 1) {
            const secondPart = parts[1];
            const startsWithActionVerb = /^(add|fix|update|remove|delete|place|use|enable|disable|migrate|refactor|cleanup|rename|show|hide|set|implement|improve|revert|replace|move|output|call|upd|initial|build)/i.test(secondPart);
            
            if (!startsWithActionVerb && secondPart[0] === secondPart[0].toUpperCase()) {
              // Second part is likely a feature/component name, include it in title
              mainTitle = `${parts[0]} - ${secondPart}`;
              subtaskStartIndex = 2;
              hasFeatureName = true;
              // Track this part so we don't add it as a subtask later
              ticketGroups[ticketId].titleParts.add(secondPart.toLowerCase());
            }
          }
          
          // Set main title - prefer titles with feature names, then use longest
          const currentHasFeature = ticketGroups[ticketId].mainTitle.includes(' - ');
          if (!ticketGroups[ticketId].mainTitle || 
              (hasFeatureName && !currentHasFeature) ||
              (hasFeatureName === currentHasFeature && ticketGroups[ticketId].mainTitle.length < mainTitle.length)) {
            ticketGroups[ticketId].mainTitle = mainTitle;
          }
          
          // Add remaining parts as subtasks (skip if already in title)
          parts.slice(subtaskStartIndex).forEach(subtask => {
            const lowerSubtask = subtask.toLowerCase();
            if (subtask && 
                !ticketGroups[ticketId].subtasks.includes(subtask) &&
                !ticketGroups[ticketId].titleParts.has(lowerSubtask)) {
              ticketGroups[ticketId].subtasks.push(subtask);
            }
          });
        } else if (description) {
          // No subtasks, just main description
          if (!ticketGroups[ticketId].mainTitle || ticketGroups[ticketId].mainTitle.length < description.length) {
            ticketGroups[ticketId].mainTitle = description;
          }
        }
      } else {
        // Non-MKIS commits (general work)
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
      
      // Add subtasks for first ticket
      firstGroup.subtasks.forEach(subtask => {
        output.push(`  - ${subtask}`);
      });
      
      // Add remaining tickets (without [8])
      ticketIds.slice(1).forEach(ticketId => {
        const group = ticketGroups[ticketId];
        output.push(`${ticketId} ${group.mainTitle}`);
        
        // Add subtasks
        group.subtasks.forEach(subtask => {
          output.push(`  - ${subtask}`);
        });
      });
      
      // Add non-ticket commits at the end if any
      if (nonTicketCommits.length > 0) {
        nonTicketCommits.forEach(commit => {
          output.push(commit);
        });
      }
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
