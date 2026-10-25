import {describe,it,expect} from 'vitest';
import {gameReducer,initialState} from '../src/engine/state';
import {doctorConversation} from '../src/data/doctorConversation';
import {visitMissions} from '../src/data/visitMissions';
import questions from '../src/data/questions.json';
import type {Question} from '../src/types';
describe('doctor scene conversation and original quiz',()=>{
 for(const mission of visitMissions) it(mission.clinic+' retains the original three lines',()=>{
  const lines=doctorConversation(mission);
  expect(lines).toHaveLength(3);
  expect(lines[0]).toEqual({speaker:mission.doctor.name,text:mission.doctor.greeting,representative:false});
  expect(lines[1]).toEqual({speaker:'外勤代表 · 你',text:'醫師您好，今天想向您介紹這項產品。',representative:true});
  expect(lines[2]).toEqual({speaker:mission.doctor.name,text:mission.doctor.invitation,representative:false});
 });
 it('returning to the clinic keeps the same ten questions for the challenge',()=>{
  const bank=Array.from({length:10},(_,i)=>({...questions[i%questions.length],id:'conversation-'+i})) as Question[];
  const started=gameReducer(initialState,{type:'START',bank});
  const talking=gameReducer(started,{type:'ENTER_ROOM'});
  const returned=gameReducer(talking,{type:'RETURN_TO_CLINIC'});
  expect(returned).toEqual({...talking,screen:'clinic'});
  expect(returned.questions).toBe(started.questions);
  expect(gameReducer(returned,{type:'BEGIN_QUIZ'})).toBe(returned);
  const resumed=gameReducer(returned,{type:'ENTER_ROOM'});
  const quiz=gameReducer(resumed,{type:'BEGIN_QUIZ'});
  expect(quiz.screen).toBe('quiz');expect(quiz.questions).toBe(started.questions);
  expect(quiz.questions).toHaveLength(10);
 });
 it('return action does not change other screens or answers',()=>{
  for(const screen of ['home','products','clinic','quiz','result'] as const){
   const state={...initialState,screen};
   expect(gameReducer(state,{type:'RETURN_TO_CLINIC'})).toBe(state);
  }
 });
});
