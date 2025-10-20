import { AskResponse, Citation } from "../../api";
import { cloneDeep } from "lodash-es";

type ParsedAnswer = {
  citations: Citation[];
  markdownFormatText: string;
  detailedBreakdown: string;
};

export function parseAnswer(answer: AskResponse): ParsedAnswer {
  // console.log(answer)
  let answerobj = {} as any;
  try{
    answerobj = JSON.parse(answer.answer)
  }
  catch(e){
    answerobj = {
      Direct_short_answer: answer.answer,
      Detailed_breakdown: ""
    }
  }
  let answerText = answerobj.Direct_short_answer;
  const MatchCitationLinks = answerText.match(/\[(doc\d\d?\d?)]/g);
  const lengthDocN = "[doc".length;
  const matchedCitationsIndex = MatchCitationLinks?.map(
    (link:any) => Number(link.slice(lengthDocN, link.length - 1))
  );
  let filteredCitations = [] as Citation[];
  for (let i = 0; i < answer.citations.length; i++) {
    if (matchedCitationsIndex && "doc_number" in answer.citations[i] && matchedCitationsIndex.includes(+(answer.citations[i].doc_number??"0"))) {
      answer.citations[i].color = "lightgreen";
      answerText = answerText.replaceAll("[doc" + (+(answer.citations[i].doc_number??"0")) + "]", "");
      let citation_found = filteredCitations.find((citation:Citation) => citation.filepath == answer.citations[i].filepath)
      if (!citation_found)
        filteredCitations.push(answer.citations[i]);
      else
        citation_found.doc_number = `${citation_found.doc_number}, ${answer.citations[i].doc_number}`;
    }
    
  }
   matchedCitationsIndex?.forEach((i:any) => {
    answerText = answerText.replaceAll("[doc" + (i + 1) + "]", `<sup>${i + 1}</sup>`);
  });
  
  answerobj.Detailed_breakdown = answerobj.Detailed_breakdown.replace(/\[doc(\d+)\]/g, (_:any, num:any) => {
    return `<sup>${num}</sup>`;
  });
  
  return {
    citations: filteredCitations,
    markdownFormatText: answerText,
    detailedBreakdown: answerobj.Detailed_breakdown
  };
}
