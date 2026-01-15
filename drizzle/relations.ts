import { relations } from "drizzle-orm/relations";
import { courses, tees, holes, scores, user, matchPlayers, rounds, matches, organizations, seasons, leagueMembers, session, teams, teamMembers, account } from "./schema";

export const teesRelations = relations(tees, ({one, many}) => ({
	course: one(courses, {
		fields: [tees.courseId],
		references: [courses.id]
	}),
	holes: many(holes),
	matchPlayers: many(matchPlayers),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	tees: many(tees),
	rounds: many(rounds),
}));

export const scoresRelations = relations(scores, ({one}) => ({
	hole: one(holes, {
		fields: [scores.holeId],
		references: [holes.id]
	}),
	user: one(user, {
		fields: [scores.updatedBy],
		references: [user.id]
	}),
	matchPlayer: one(matchPlayers, {
		fields: [scores.matchPlayerId],
		references: [matchPlayers.id]
	}),
}));

export const holesRelations = relations(holes, ({one, many}) => ({
	scores: many(scores),
	tee: one(tees, {
		fields: [holes.teeId],
		references: [tees.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	scores: many(scores),
	leagueMembers: many(leagueMembers),
	matchPlayers: many(matchPlayers),
	sessions: many(session),
	accounts: many(account),
}));

export const matchPlayersRelations = relations(matchPlayers, ({one, many}) => ({
	scores: many(scores),
	user: one(user, {
		fields: [matchPlayers.userId],
		references: [user.id]
	}),
	match: one(matches, {
		fields: [matchPlayers.matchId],
		references: [matches.id]
	}),
	tee: one(tees, {
		fields: [matchPlayers.teeId],
		references: [tees.id]
	}),
}));

export const matchesRelations = relations(matches, ({one, many}) => ({
	round: one(rounds, {
		fields: [matches.roundId],
		references: [rounds.id]
	}),
	matchPlayers: many(matchPlayers),
}));

export const roundsRelations = relations(rounds, ({one, many}) => ({
	matches: many(matches),
	course: one(courses, {
		fields: [rounds.courseId],
		references: [courses.id]
	}),
	season: one(seasons, {
		fields: [rounds.seasonId],
		references: [seasons.id]
	}),
}));

export const seasonsRelations = relations(seasons, ({one, many}) => ({
	organization: one(organizations, {
		fields: [seasons.organizationId],
		references: [organizations.id]
	}),
	rounds: many(rounds),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	seasons: many(seasons),
	leagueMembers: many(leagueMembers),
	teams: many(teams),
}));

export const leagueMembersRelations = relations(leagueMembers, ({one, many}) => ({
	user: one(user, {
		fields: [leagueMembers.userId],
		references: [user.id]
	}),
	organization: one(organizations, {
		fields: [leagueMembers.organizationId],
		references: [organizations.id]
	}),
	teamMembers: many(teamMembers),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	leagueMember: one(leagueMembers, {
		fields: [teamMembers.leagueMemberId],
		references: [leagueMembers.id]
	}),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	teamMembers: many(teamMembers),
	organization: one(organizations, {
		fields: [teams.organizationId],
		references: [organizations.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));