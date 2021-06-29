/*
    mapping-and-packing.ts - Attribute mapping and packing

    This tests simple mapping of properties to an abbreviated attribute and
    packing properties into a single attribute
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {MappedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'MappingAndPackingTestTable2',
    client: Client,
    schema: MappedSchema,
    // _logger: true,
})

//  MOB - map updated, created, type

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = null
let user: any
let users: any[]

test('Create', async() => {
    User = table.getModel('User')
    user = await User.create({
        name: 'Peter Smith',
        status: 'active',
        email: 'peter@example.com',
        address: '444 Cherry Tree Lane',
        city: 'Paris',
        zip: '1234567'
    })
    dump(user)
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Get', async() => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Get including hidden', async() => {
    //  Returns property names without hidden (primaryKey)
    let u = await User.get({id: user.id}, {hidden: true})
    expect(u).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        primarySort: 'us#',
        secHash: 'ty#us',
        secSort: `us#${u.id}`,
    })
    expect(u.id).toMatch(Match.ulid)
    expect(u.primaryHash).toEqual(`us#${u.id}`)
    expect(u.primarySort).toEqual(`us#`)
    expect(u.secHash).toEqual(`ty#us`)
    expect(u.secSort).toEqual(`us#${u.id}`)
    expect(u.updated).toEqual(expect.any(Date))
})

test('Get without parse', async() => {
    //  Returns attributes without parsing including hidden (pk, sk)
    let u = await User.get({id: user.id}, {hidden: true, parse: false})
    expect(u.id.S).toMatch(Match.ulid)
    expect(u.em.S).toEqual('peter@example.com')
    expect(u.pk.S).toEqual(`us#${u.id.S}`)
    expect(u.sk.S).toEqual(`us#`)
    expect(u.gs1pk.S).toEqual(`ty#us`)
    expect(u.gs1sk.S).toEqual(`us#${u.id.S}`)
})

test('Find by ID', async() => {
    users = await User.find({id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by name on GSI', async() => {
    users = await User.find({name: user.name}, {index: 'gs1'})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async() => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Remove attribute', async() => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async() => {
    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, status: 'active'}, {remove: ['secHash', 'secSort'], hidden: true})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        primarySort: 'us#',
    })
    expect(user.secHash).toBeUndefined()
    expect(user.secSort).toBeUndefined()
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item', async() => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async() => {
    user = await User.create({name: 'Sky Blue', status: 'active'})
    users = await User.scan({})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async() => {
    users = await User.scan({})
    expect(users.length).toBe(1)

    for (let user of users) {
        await User.remove({id: user.id})
    }
    users = await User.scan({})
    expect(users.length).toBe(0)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})